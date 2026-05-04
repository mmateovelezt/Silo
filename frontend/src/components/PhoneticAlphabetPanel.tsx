import React from 'react';
import { PHONETIC_ALPHABET } from '../data/phonetic_alphabet';

interface PhoneticAlphabetPanelProps {
  onClose: () => void;
}

export const PhoneticAlphabetPanel: React.FC<PhoneticAlphabetPanelProps> = ({ onClose }) => {
  return (
    <div className="overlay open" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mhdr">
          <div className="mtitle">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 12.5L6.5 3.5l3.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.2 9.5h4.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M11 5.5c0 0 .8-1 1.5-1s1.5.55 1.5 1.4c0 1.8-3 2.9-3 2.9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Alfabeto Aeronáutico
          </div>
          <button className="mcls" onClick={onClose}>
            <svg viewBox="0 0 13 13" fill="none">
              <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="mbody">
          <div className="agrid">
            {PHONETIC_ALPHABET.map((a) => (
              <div className="acard" key={a.letter}>
                <div className="aletter">{a.letter}</div>
                <div className="aword">{a.word}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
