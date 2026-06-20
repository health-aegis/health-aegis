import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';

export default function UserManagement() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null); // patientId being updated
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, cgRes] = await Promise.all([adminAPI.getUsers(), adminAPI.getCaregivers()]);
      setUsers(usersRes.data);
      setCaregivers(cgRes.data);
    } catch {
      addToast('Failed to load users from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (patientId, caregiverId) => {
    setAssigning(patientId);
    try {
      const updated = caregiverId
        ? await adminAPI.assignPatient(patientId, caregiverId)
        : await adminAPI.unassignPatient(patientId);
      setUsers(prev => prev.map(u => u._id === patientId ? updated.data : u));
      addToast(caregiverId ? 'Patient assigned to caregiver.' : 'Patient unassigned.', 'success');
    } catch {
      addToast('Failed to update assignment.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await adminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      addToast('User deleted successfully.', 'success');
      setConfirmDelete(null);
    } catch {
      addToast('Failed to delete user.', 'error');
    }
  };

  const filtered = users.filter(u => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const patients = filtered.filter(u => u.role === 'patient');
  const nonPatients = filtered.filter(u => u.role !== 'patient');

  const roleColor = (role) => {
    if (role === 'admin') return { bg: 'rgba(147,51,234,0.12)', color: 'var(--accent-purple)' };
    if (role === 'caregiver') return { bg: 'rgba(20,184,166,0.12)', color: 'var(--accent-teal)' };
    return { bg: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)' };
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid var(--border-glass)',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {users.length} registered users · Assign patients to caregivers
          </p>
        </div>
        <button className="btn-submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '20px' }}
          onClick={fetchAll}>
          ↻ Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Users', value: users.length, color: 'var(--accent-cyan)' },
          { label: 'Patients', value: users.filter(u => u.role === 'patient').length, color: 'var(--accent-blue)' },
          { label: 'Caregivers', value: users.filter(u => u.role === 'caregiver').length, color: 'var(--accent-teal)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="widget-glass" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '900', color }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="widget-glass" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input type="text" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ ...inputStyle, minWidth: '140px' }}>
            <option value="all">All Roles</option>
            <option value="patient">Patients</option>
            <option value="caregiver">Caregivers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>⏳ Loading users...</div>
      ) : users.length === 0 ? (
        <div className="widget-glass" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
          <p style={{ color: 'var(--text-muted)' }}>No users registered yet. Users appear here after signing up.</p>
        </div>
      ) : (
        <>
          {/* Patient Assignment Table */}
          {(filterRole === 'all' || filterRole === 'patient') && patients.length > 0 && (
            <div className="widget-glass" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                  Patients
                  <span style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--accent-cyan)', padding: '0.1rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', marginLeft: '0.5rem' }}>{patients.length}</span>
                </h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['Patient', 'Email', 'Registered', 'Assigned Caregiver', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const assignedId = patient.assignedCaregiverId?._id || patient.assignedCaregiverId?.id || patient.assignedCaregiverId;
                    const assignedCg = caregivers.find(c => (c._id || c.id) === String(assignedId || ''));
                    return (
                      <tr key={patient._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                              {patient.name[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{patient.name}</div>
                              <div style={{ ...roleColor('patient'), fontSize: '0.7rem', fontWeight: '700', display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '6px', marginTop: '0.15rem' }}>Patient</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{patient.email}</td>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {caregivers.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No caregivers registered</span>
                          ) : (
                            <select
                              value={assignedCg?._id || ''}
                              onChange={e => handleAssign(patient._id, e.target.value || null)}
                              disabled={assigning === patient._id}
                              style={{ ...inputStyle, minWidth: '180px', cursor: 'pointer' }}>
                              <option value="">— Unassigned —</option>
                              {caregivers.map(cg => (
                                <option key={cg._id} value={cg._id}>{cg.name}</option>
                              ))}
                            </select>
                          )}
                          {assigning === patient._id && (
                            <span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Saving...</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                          <button onClick={() => setConfirmDelete(patient)}
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--accent-rose)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Caregivers & Admins Table */}
          {(filterRole === 'all' || filterRole === 'caregiver' || filterRole === 'admin') && nonPatients.length > 0 && (
            <div className="widget-glass">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.5rem' }}>👨‍⚕️</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Staff — Caregivers & Admins</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    {['User', 'Email', 'Role', 'Assigned Patients', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nonPatients.map((staff) => {
                    const rc = roleColor(staff.role);
                    const staffId = staff._id || staff.id;
                    const assignedPatientsCount = users.filter(u => {
                      const aId = u.assignedCaregiverId?._id || u.assignedCaregiverId?.id || u.assignedCaregiverId;
                      return u.role === 'patient' && String(aId) === String(staffId);
                    }).length;
                    return (
                      <tr key={staff._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `linear-gradient(135deg, ${rc.color}, var(--accent-blue))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', flexShrink: 0 }}>
                              {staff.name[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{staff.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{staff.email}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ background: rc.bg, color: rc.color, padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'capitalize' }}>{staff.role}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {staff.role === 'caregiver' ? (
                            <span style={{ fontWeight: '700', color: assignedPatientsCount > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                              {assignedPatientsCount} patient{assignedPatientsCount !== 1 ? 's' : ''}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                          <button onClick={() => setConfirmDelete(staff)}
                            style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--accent-rose)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="widget-glass" style={{ width: '420px', padding: '2rem', border: '1px solid rgba(244,63,94,0.3)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>⚠️ Delete User</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', lineHeight: '1.6' }}>
              Are you sure you want to permanently delete <strong style={{ color: '#fff' }}>{confirmDelete.name}</strong>?
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This action cannot be undone. All data linked to this account will remain.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-glass)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete._id)}
                style={{ background: 'var(--accent-rose)', border: 'none', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
