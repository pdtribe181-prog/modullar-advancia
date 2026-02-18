import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link to="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
