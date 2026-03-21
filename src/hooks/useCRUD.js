// src/hooks/useCRUD.js
import { useState, useEffect, useCallback } from 'react';

export function useCRUD(dbMethods) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error } = await dbMethods.list();
    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (formData) => {
    setSaving(true); setError('');
    let result;
    if (modal.mode === 'add') {
      result = await dbMethods.insert(formData);
    } else {
      result = await dbMethods.update(modal.data.id, formData);
    }
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    await load();
    setModal(null);
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm('Delete this record?')) return;
    const { error } = await dbMethods.remove(id);
    if (error) setError(error.message);
    else setRows(r => r.filter(x => x.id !== id));
  };

  const openAdd  = ()    => setModal({ mode: 'add',  data: {} });
  const openEdit = (row) => setModal({ mode: 'edit', data: { ...row } });

  const filtered = search
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : rows;

  return { rows: filtered, allRows: rows, loading, error, modal, setModal, save, remove, openAdd, openEdit, search, setSearch, saving, reload: load };
}
