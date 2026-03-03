// frontend/src/components/ContextMenu.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, menuItems, onClose }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: y, left: x, opacity: 0 });

  // After render, measure and clamp position to keep menu fully on-screen
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 6;

    let left = x;
    let top = y;

    // Flip left if would overflow right edge
    if (left + w + MARGIN > vw) left = Math.max(MARGIN, x - w);
    // Clamp to left edge
    if (left < MARGIN) left = MARGIN;

    // Flip up if would overflow bottom edge
    if (top + h + MARGIN > vh) top = Math.max(MARGIN, y - h);
    // Clamp to top edge
    if (top < MARGIN) top = MARGIN;

    setPos({ top, left, opacity: 1 });
  }, [x, y, menuItems]);

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
      style={{ top: pos.top, left: pos.left, opacity: pos.opacity }}
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