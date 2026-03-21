// src/pages/UsersPage.jsx
import { useEffect, useState } from 'react';
import { db } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Loader } from './Drivers';

export default function UsersPage() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db.profiles.list();
    if (error) setError(error.message);
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (user) => {
    if (user.id === me.id) { alert("You can't change your own role."); return; }
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change ${user.display_name || user.email} to ${newRole}?`)) return;
    setUpdating(user.id);
    const { error } = await db.profiles.updateRole(user.id, newRole);
    if (error) setError(error.message);
    else setUsers(u => u.map(x => x.id === user.id ? { ...x, role: newRole } : x));
    setUpdating(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-subtitle">Admin</div>
          <h1 className="page-title" style={{ marginTop: 6 }}>
            Users <span style={{ color: 'var(--red)' }}>({users.length})</span>
          </h1>
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
      {loading ? <Loader /> : (
        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: u.role === 'admin' ? 'var(--red)' : 'var(--blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--sans)', fontWeight: 900, fontSize: 13,
                        flexShrink: 0,
                      }}>
                        {(u.display_name || u.email)?.[0]?.toUpperCase()}
                      </div>
                      <b>{u.display_name || '—'}</b>
                      {u.id === me.id && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(you)</span>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 12 }}>{u.email}</td>
                  <td><span className={`badge badge-${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.role === 'admin' ? 'btn-danger' : 'btn-blue'}`}
                      onClick={() => toggleRole(u)}
                      disabled={u.id === me.id || updating === u.id}
                    >
                      {updating === u.id ? <span className="spinner" /> : null}
                      {u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 18, marginTop: 20, borderLeft: '3px solid var(--accent)' }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--accent)' }}>Note:</strong> Admins have full CRUD access to all data and can import from external APIs.
          Users have read-only access. Role changes take effect on next login.
          To create the first admin, run this SQL in Supabase: <br />
          <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3, fontSize: 11 }}>
            UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
          </code>
        </p>
      </div>
    </div>
  );
}
