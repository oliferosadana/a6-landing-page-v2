import React from 'react';
import { useData } from '../../context/DataContext';

export default function Toast() {
  const { toast } = useData();

  if (!toast) return null;

  return (
    <div id="promo-toast" className="promo-toast show" role="alert" aria-live="assertive">
      <div className="toast-icon-wrap">
        <i
          className={
            toast.type === 'error'
              ? 'fa-solid fa-triangle-exclamation'
              : toast.type === 'success'
              ? 'fa-solid fa-circle-check'
              : 'fa-solid fa-circle-info'
          }
          id="toast-icon"
        ></i>
      </div>
      <div className="toast-body">
        <span className="toast-headline">Info Amanda Kalimantan</span>
        <span id="toast-message" className="toast-text">
          {toast.message}
        </span>
      </div>
    </div>
  );
}
