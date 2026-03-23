// src/components/Accordion.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AccordionContext = createContext({ openItem: null, setOpenItem: () => {} });
const AccordionItemContext = createContext(null);

export function Accordion({ children, defaultOpen = null, style }) {
  const [openItem, setOpenItem] = useState(defaultOpen);
  return (
    <AccordionContext.Provider value={{ openItem, setOpenItem }}>
      <div style={{ width: '100%', ...style }}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children, style }) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', ...style }}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({ children, style }) {
  const { openItem, setOpenItem } = useContext(AccordionContext);
  const value = useContext(AccordionItemContext);
  const isOpen = openItem === value;

  return (
    <button
      type="button"
      onClick={() => setOpenItem(isOpen ? null : value)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--sans)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: isOpen ? '#fff' : 'rgba(255,255,255,0.5)',
        textAlign: 'left',
        transition: 'color 0.15s',
        ...style,
      }}
    >
      <span>{children}</span>
      <ChevronDown
        size={15}
        style={{
          flexShrink: 0,
          color: isOpen ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.22s ease, color 0.15s',
        }}
      />
    </button>
  );
}

export function AccordionPanel({ children, style }) {
  const { openItem } = useContext(AccordionContext);
  const value = useContext(AccordionItemContext);
  const isOpen = openItem === value;
  const innerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (innerRef.current) setHeight(innerRef.current.scrollHeight);
    });
    ro.observe(innerRef.current);
    setHeight(innerRef.current.scrollHeight);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{
        overflow: 'hidden',
        height: isOpen ? height : 0,
        transition: 'height 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
    >
      <div ref={innerRef} style={{ paddingBottom: 16 }}>
        {children}
      </div>
    </div>
  );
}
