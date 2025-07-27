// frontend/src/components/ContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, menuItems, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!menuItems || menuItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: y, left: x }}
      // onClick={(e) => e.stopPropagation()} // Prevent click on menu itself from closing if not handled by list item
    >
      <ul>
        {menuItems.map((menuItem, index) => (
          <li
            key={index}
            onClick={(e) => {
              e.stopPropagation(); 
              if (!menuItem.disabled && menuItem.action) {
                menuItem.action();
              }
              // Always close after an action is attempted or if it's just a click on a non-actionable item (though all should have actions or be headers)
              onClose(); 
            }}
            className={menuItem.disabled ? 'disabled' : ''}
          >
            {menuItem.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;