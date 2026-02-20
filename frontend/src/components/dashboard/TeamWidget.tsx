import { useState } from 'react';
import { cardStyle, btnPrimary, btnSmall, badgeStyle, type TeamMember } from './shared';

const ROLE_COLORS: Record<string, string> = {
  admin: '#dc2626',
  provider: '#2563eb',
  billing: '#d97706',
  viewer: '#6b7280',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  provider: 'Provider',
  billing: 'Billing',
  viewer: 'Viewer',
};

const defaultMembers: TeamMember[] = [
  { id: '1', email: 'admin@advancia.io', name: 'Admin User', role: 'admin', status: 'active', lastActive: new Date().toISOString() },
  { id: '2', email: 'dr.smith@clinic.com', name: 'Dr. Smith', role: 'provider', status: 'active', lastActive: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', email: 'billing@advancia.io', name: 'Billing Team', role: 'billing', status: 'active' },
];

/**
 * Team management widget — shows members, roles, and allows inviting new members.
 */
export function TeamWidget({ members: initialMembers = defaultMembers }: { members?: TeamMember[] } = {}) {
  const [members] = useState(initialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('viewer');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filtered = filterRole === 'all' ? members : members.filter((m) => m.role === filterRole);

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>👥 Team</h3>
        <button onClick={() => setShowInvite(!showInvite)} style={btnSmall}>
          {showInvite ? 'Cancel' : '+ Invite'}
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div style={{
          padding: '16px', background: '#f9fafb', borderRadius: '10px',
          marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap',
        }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="team@example.com"
            style={{ flex: 1, minWidth: '180px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
          >
            <option value="viewer">Viewer</option>
            <option value="billing">Billing</option>
            <option value="provider">Provider</option>
            <option value="admin">Admin</option>
          </select>
          <button style={btnPrimary}>Send Invite</button>
        </div>
      )}

      {/* Role filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {['all', 'admin', 'provider', 'billing', 'viewer'].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            style={{
              padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
              border: filterRole === role ? '1px solid #667eea' : '1px solid #e5e7eb',
              background: filterRole === role ? '#ede9fe' : 'white',
              color: filterRole === role ? '#667eea' : '#6b7280',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {role === 'all' ? 'All' : ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((member) => (
          <div key={member.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '10px', background: '#f9fafb',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: ROLE_COLORS[member.role] + '20', color: ROLE_COLORS[member.role],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '14px',
            }}>
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: '500', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.name}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '12px' }}>{member.email}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={badgeStyle(ROLE_COLORS[member.role])}>{ROLE_LABELS[member.role]}</span>
              <p style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
                {member.status === 'invited' ? '📩 Invited' : formatRelativeTime(member.lastActive)}
              </p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
            No team members in this role.
          </p>
        )}
      </div>
    </div>
  );
}
