import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaExclamationTriangle, FaSignOutAlt } from 'react-icons/fa';
import './LogoutConfirmationModal.css';

const LogoutConfirmationModal = ({ isOpen, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="logout-modal-overlay" onClick={handleOverlayClick}>
      <div className="logout-modal">
        <div className="logout-modal-header">
          <div className="logout-modal-icon">
            <FaExclamationTriangle />
          </div>
          <h3>{t('logoutConfirmation.title')}</h3>
        </div>
        
        <div className="logout-modal-body">
          <p>{t('logoutConfirmation.message')}</p>
        </div>
        
        <div className="logout-modal-footer">
          <button 
            className="logout-modal-btn cancel-btn" 
            onClick={onCancel}
          >
            {t('logoutConfirmation.cancel')}
          </button>
          <button 
            className="logout-modal-btn confirm-btn" 
            onClick={onConfirm}
          >
            <FaSignOutAlt className="btn-icon" />
            {t('logoutConfirmation.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
