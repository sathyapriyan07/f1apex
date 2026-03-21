// src/components/Modal.jsx
export default function Modal({ title, onClose, children, maxWidth = 540 }) {
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
