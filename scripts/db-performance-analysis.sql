-- ============================================================================
-- Database Performance Analysis Script
-- Run in Supabase SQL Editor to diagnose slow queries, index usage, and
-- connection pooling health.
-- ============================================================================

-- ============================================================================
-- 1. SLOW QUERY ANALYSIS
-- ============================================================================

-- Top 20 slowest queries (requires pg_stat_statements extension)
SELECT
  LEFT(query, 120) AS query_snippet,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(max_exec_time::numeric, 2) AS max_ms,
  rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Queries that produce the most total load
SELECT
  LEFT(query, 120) AS query_snippet,
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND((total_exec_time / NULLIF(calls, 0))::numeric, 2) AS avg_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- ============================================================================
-- 2. INDEX USAGE ANALYSIS
-- ============================================================================

-- Tables with low index usage (sequential scans > index scans)
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  idx_scan,
  CASE WHEN (seq_scan + idx_scan) > 0
    THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 1)
    ELSE 0 END AS idx_usage_pct,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE n_live_tup > 100
ORDER BY idx_usage_pct ASC, n_live_tup DESC
LIMIT 30;

-- Unused indexes (indexes that have never been scanned)
SELECT
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Missing indexes: tables with high sequential scan counts
SELECT
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND n_live_tup > 1000
  AND (idx_scan IS NULL OR idx_scan < seq_scan)
ORDER BY seq_tup_read DESC
LIMIT 15;

-- ============================================================================
-- 3. TABLE SIZE & BLOAT
-- ============================================================================

-- Table sizes (top 20)
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  CASE WHEN n_live_tup > 0
    THEN ROUND(100.0 * n_dead_tup / n_live_tup, 1)
    ELSE 0 END AS dead_row_pct
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- Tables needing vacuum (high dead tuple ratio)
SELECT
  relname AS table_name,
  n_live_tup,
  n_dead_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 1) AS dead_pct,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 15;

-- ============================================================================
-- 4. CONNECTION POOLING & ACTIVE CONNECTIONS
-- ============================================================================

-- Current connections by state
SELECT
  state,
  COUNT(*) AS connections,
  ROUND(AVG(EXTRACT(EPOCH FROM (now() - state_change)))::numeric, 1) AS avg_age_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state
ORDER BY connections DESC;

-- Long-running queries (> 5 seconds)
SELECT
  pid,
  state,
  ROUND(EXTRACT(EPOCH FROM (now() - query_start))::numeric, 1) AS duration_seconds,
  LEFT(query, 100) AS query_snippet,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
  AND query_start < now() - interval '5 seconds'
ORDER BY duration_seconds DESC;

-- Blocked queries (waiting for locks)
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query,
  ROUND(EXTRACT(EPOCH FROM (now() - blocked.query_start))::numeric, 1) AS wait_seconds
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid
JOIN pg_locks kl ON kl.locktype = bl.locktype
  AND kl.database IS NOT DISTINCT FROM bl.database
  AND kl.relation IS NOT DISTINCT FROM bl.relation
  AND kl.page IS NOT DISTINCT FROM bl.page
  AND kl.tuple IS NOT DISTINCT FROM bl.tuple
  AND kl.virtualxid IS NOT DISTINCT FROM bl.virtualxid
  AND kl.transactionid IS NOT DISTINCT FROM bl.transactionid
  AND kl.classid IS NOT DISTINCT FROM bl.classid
  AND kl.objid IS NOT DISTINCT FROM bl.objid
  AND kl.objsubid IS NOT DISTINCT FROM bl.objsubid
  AND kl.pid != bl.pid
JOIN pg_stat_activity blocking ON kl.pid = blocking.pid
WHERE NOT bl.granted;

-- Connection pool health: max connections vs current
SELECT
  (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  (SELECT COUNT(*) FROM pg_stat_activity) AS current_connections,
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') AS idle_connections,
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction') AS idle_in_transaction;

-- ============================================================================
-- 5. CACHE HIT RATIO
-- ============================================================================

-- Overall cache hit ratio (should be > 99%)
SELECT
  'index hit ratio' AS metric,
  ROUND(
    SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit + idx_blks_read), 0) * 100, 2
  ) AS ratio_pct
FROM pg_statio_user_indexes
UNION ALL
SELECT
  'table hit ratio',
  ROUND(
    SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit + heap_blks_read), 0) * 100, 2
  )
FROM pg_statio_user_tables;

-- ============================================================================
-- 6. LOCK CONTENTION
-- ============================================================================

-- Current locks by type
SELECT
  locktype,
  mode,
  COUNT(*) AS lock_count,
  COUNT(*) FILTER (WHERE granted) AS granted,
  COUNT(*) FILTER (WHERE NOT granted) AS waiting
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY locktype, mode
ORDER BY lock_count DESC;

-- ============================================================================
-- 7. REPLICATION LAG (if applicable)
-- ============================================================================

SELECT
  client_addr,
  state,
  ROUND(EXTRACT(EPOCH FROM replay_lag)::numeric, 3) AS replay_lag_seconds,
  ROUND(EXTRACT(EPOCH FROM write_lag)::numeric, 3) AS write_lag_seconds
FROM pg_stat_replication;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
-- After reviewing results:
-- 1. Add indexes for tables with low idx_usage_pct and high seq_scan
-- 2. Drop unused indexes to save write overhead
-- 3. Tune max_connections / PgBouncer pool_size if connections near limit
-- 4. VACUUM ANALYZE tables with high dead_row_pct
-- 5. Investigate long-running queries and add missing indexes
-- 6. Ensure cache hit ratios > 99% (increase shared_buffers if needed)
