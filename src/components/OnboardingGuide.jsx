import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const STORAGE_KEY = (id) => `clade_onboarded_v1_${id}`

// ── Illustrations SVG ────────────────────────────────────────────────────────

const IlluWelcome = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="80" y="60" width="100" height="90" rx="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="93" y="72" width="28" height="28" rx="2" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1"/>
    <rect x="139" y="72" width="28" height="28" rx="2" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1"/>
    <rect x="93" y="110" width="74" height="28" rx="2" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1"/>
    <line x1="130" y1="20" x2="130" y2="60" stroke="#E4E8F0" strokeWidth="1.5" strokeDasharray="4 3"/>
    <circle cx="130" cy="14" r="8" fill="#0A1E3F"/>
    <text x="130" y="18" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="sans-serif">C</text>
    <path d="M60 150 Q80 130 100 145 Q120 158 140 143 Q160 128 180 150" stroke="#06B6D4" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="60" cy="150" r="3" fill="#06B6D4" opacity="0.6"/>
    <circle cx="130" cy="143" r="2.5" fill="#06B6D4" opacity="0.4"/>
    <circle cx="200" cy="150" r="3" fill="#06B6D4" opacity="0.6"/>
    <circle cx="44" cy="90" r="5" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <circle cx="216" cy="80" r="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <circle cx="220" cy="120" r="3" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1" opacity="0.5"/>
  </svg>
)

const IlluPlanning = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="55" y="45" width="150" height="115" rx="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="55" y="45" width="150" height="32" rx="6" fill="#0A1E3F"/>
    <rect x="55" y="65" width="150" height="12" fill="#0A1E3F"/>
    <circle cx="87" cy="61" r="3.5" fill="#06B6D4"/>
    <circle cx="130" cy="61" r="3.5" fill="rgba(255,255,255,0.3)"/>
    <circle cx="173" cy="61" r="3.5" fill="rgba(255,255,255,0.3)"/>
    {[0,1,2,3,4,5,6].map(col => (
      <text key={col} x={70 + col * 20} y={92} textAnchor="middle" fontSize="7" fill="#6B7A99" fontFamily="sans-serif">
        {['L','M','M','J','V','S','D'][col]}
      </text>
    ))}
    {[0,1,2,3].map(row =>
      [0,1,2,3,4,5,6].map(col => {
        const day = row * 7 + col + 1
        const isActive = [3, 8, 14, 20].includes(day)
        const isToday = day === 10
        return day <= 28 ? (
          <g key={`${row}-${col}`}>
            {isToday && <circle cx={70 + col * 20} cy={103 + row * 18} r="8" fill="#06B6D4" opacity="0.15"/>}
            <text x={70 + col * 20} y={107 + row * 18} textAnchor="middle" fontSize="8"
              fill={isActive ? '#3B82F6' : isToday ? '#06B6D4' : '#0A1E3F'} fontWeight={isActive || isToday ? '700' : '400'}
              fontFamily="sans-serif">{day}</text>
            {isActive && <circle cx={70 + col * 20} cy={111 + row * 18} r="1.5" fill="#3B82F6"/>}
          </g>
        ) : null
      })
    )}
  </svg>
)

const IlluProjects = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="55" y="65" width="150" height="100" rx="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <path d="M55 75 Q55 65 65 65 H120 L130 75 H205 Q205 75 205 85 H55 Z" fill="#0A1E3F"/>
    <rect x="70" y="95" width="55" height="4" rx="2" fill="#3B82F6" opacity="0.5"/>
    <rect x="70" y="105" width="40" height="3" rx="1.5" fill="#6B7A99" opacity="0.4"/>
    <rect x="70" y="115" width="50" height="3" rx="1.5" fill="#6B7A99" opacity="0.4"/>
    <rect x="70" y="125" width="35" height="3" rx="1.5" fill="#6B7A99" opacity="0.4"/>
    <rect x="145" y="92" width="45" height="60" rx="3" fill="white" stroke="#E4E8F0" strokeWidth="1"/>
    <line x1="153" y1="105" x2="182" y2="105" stroke="#E4E8F0" strokeWidth="1"/>
    <line x1="153" y1="113" x2="182" y2="113" stroke="#E4E8F0" strokeWidth="1"/>
    <line x1="153" y1="121" x2="182" y2="121" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="153" y="130" width="20" height="14" rx="2" fill="#06B6D4" opacity="0.2"/>
    <line x1="155" y1="134" x2="171" y2="134" stroke="#06B6D4" strokeWidth="1"/>
    <line x1="155" y1="139" x2="168" y2="139" stroke="#06B6D4" strokeWidth="1"/>
    <circle cx="138" cy="65" r="12" fill="#3B82F6"/>
    <path d="M133 65 L136 68 L143 61" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IlluTeam = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="130" cy="72" r="22" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="130" cy="68" r="10" fill="#0A1E3F"/>
    <path d="M108 110 Q108 88 130 88 Q152 88 152 110" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="80" cy="85" r="16" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="80" cy="82" r="7" fill="#6B7A99" opacity="0.5"/>
    <path d="M64 118 Q64 100 80 100 Q96 100 96 118" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="180" cy="85" r="16" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="180" cy="82" r="7" fill="#6B7A99" opacity="0.5"/>
    <path d="M164 118 Q164 100 180 100 Q196 100 196 118" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <line x1="96" y1="108" x2="108" y2="108" stroke="#06B6D4" strokeWidth="1" strokeDasharray="3 2"/>
    <line x1="152" y1="108" x2="164" y2="108" stroke="#06B6D4" strokeWidth="1" strokeDasharray="3 2"/>
    <rect x="100" y="140" width="60" height="22" rx="4" fill="#0A1E3F"/>
    <text x="130" y="155" textAnchor="middle" fontSize="8" fill="white" fontFamily="sans-serif" letterSpacing="1">ÉQUIPE</text>
  </svg>
)

const IlluFinance = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <line x1="55" y1="145" x2="205" y2="145" stroke="#E4E8F0" strokeWidth="1.5"/>
    <line x1="55" y1="145" x2="55" y2="45" stroke="#E4E8F0" strokeWidth="1.5"/>
    {[0,1,2,3].map(i => (
      <line key={i} x1="55" y1={120 - i * 25} x2="205" y2={120 - i * 25} stroke="#EEF1F6" strokeWidth="1" strokeDasharray="4 3"/>
    ))}
    {[
      { x: 75, h: 45, c: '#3B82F6' },
      { x: 105, h: 65, c: '#06B6D4' },
      { x: 135, h: 55, c: '#3B82F6' },
      { x: 165, h: 80, c: '#06B6D4' },
      { x: 195, h: 95, c: '#0A1E3F' },
    ].map(({ x, h, c }) => (
      <rect key={x} x={x - 12} y={145 - h} width="24" height={h} rx="3" fill={c} opacity="0.85"/>
    ))}
    <path d="M75 100 L105 80 L135 90 L165 65 L195 50" stroke="#06B6D4" strokeWidth="1.5" fill="none" strokeDasharray="4 2" strokeLinecap="round"/>
    {[75, 105, 135, 165, 195].map((x, i) => (
      <circle key={x} cx={x} cy={[100, 80, 90, 65, 50][i]} r="3" fill="#06B6D4"/>
    ))}
    <rect x="160" y="48" width="50" height="22" rx="4" fill="white" stroke="#E4E8F0" strokeWidth="1"/>
    <text x="185" y="62" textAnchor="middle" fontSize="9" fill="#0A1E3F" fontWeight="600" fontFamily="sans-serif">+18%</text>
  </svg>
)

const IlluHR = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="110" cy="75" r="30" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="110" cy="70" r="14" fill="#0A1E3F"/>
    <path d="M80 120 Q80 96 110 96 Q140 96 140 120" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="148" y="60" width="65" height="20" rx="4" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1"/>
    <rect x="148" y="88" width="65" height="20" rx="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="148" y="116" width="65" height="20" rx="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <text x="180" y="74" textAnchor="middle" fontSize="7.5" fill="#0A1E3F" fontFamily="sans-serif">Architecte Senior</text>
    <text x="180" y="102" textAnchor="middle" fontSize="7.5" fill="#6B7A99" fontFamily="sans-serif">Chef de Projet</text>
    <text x="180" y="130" textAnchor="middle" fontSize="7.5" fill="#6B7A99" fontFamily="sans-serif">Dessinateur</text>
    <circle cx="145" cy="70" r="6" fill="#06B6D4"/>
    <path d="M142 70 L144 72 L149 67" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="145" cy="98" r="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <circle cx="145" cy="126" r="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
  </svg>
)

const IlluCRM = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="45" y="55" width="75" height="90" rx="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="82" cy="80" r="14" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="82" cy="76" r="6" fill="#0A1E3F"/>
    <path d="M62 105 Q62 91 82 91 Q102 91 102 105" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1"/>
    <rect x="58" y="112" width="48" height="5" rx="2.5" fill="#6B7A99" opacity="0.3"/>
    <rect x="63" y="122" width="38" height="5" rx="2.5" fill="#6B7A99" opacity="0.3"/>
    <rect x="140" y="55" width="75" height="90" rx="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="177" cy="80" r="14" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="177" cy="76" r="6" fill="#6B7A99" opacity="0.5"/>
    <path d="M157 105 Q157 91 177 91 Q197 91 197 105" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="153" y="112" width="48" height="5" rx="2.5" fill="#6B7A99" opacity="0.3"/>
    <rect x="158" y="122" width="38" height="5" rx="2.5" fill="#6B7A99" opacity="0.3"/>
    <path d="M120 90 L140 90" stroke="#06B6D4" strokeWidth="1.5" strokeDasharray="3 2"/>
    <circle cx="130" cy="90" r="6" fill="#06B6D4"/>
    <path d="M127 90 L129 92 L134 87" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IlluMessages = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="55" y="45" width="130" height="70" rx="10" fill="#0A1E3F"/>
    <rect x="65" y="58" width="70" height="6" rx="3" fill="rgba(255,255,255,0.2)"/>
    <rect x="65" y="70" width="50" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
    <rect x="65" y="82" width="60" height="6" rx="3" fill="rgba(255,255,255,0.15)"/>
    <path d="M80 115 L70 130" stroke="#0A1E3F" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="65" cy="133" r="4" fill="#0A1E3F"/>
    <rect x="75" y="100" width="130" height="65" rx="10" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <rect x="87" y="115" width="65" height="6" rx="3" fill="#3B82F6" opacity="0.4"/>
    <rect x="87" y="127" width="48" height="6" rx="3" fill="#3B82F6" opacity="0.3"/>
    <rect x="87" y="139" width="55" height="6" rx="3" fill="#3B82F6" opacity="0.3"/>
    <path d="M180 165 L190 175" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="194" cy="178" r="4" fill="#3B82F6" opacity="0.7"/>
  </svg>
)

const IlluPortfolio = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="40" y="40" width="180" height="115" rx="8" fill="#F4F6FB" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="40" y="40" width="180" height="22" rx="8" fill="#0A1E3F"/>
    <rect x="40" y="51" width="180" height="11" fill="#0A1E3F"/>
    <circle cx="56" cy="51" r="4" fill="#EF4444" opacity="0.7"/>
    <circle cx="69" cy="51" r="4" fill="#F59E0B" opacity="0.7"/>
    <circle cx="82" cy="51" r="4" fill="#10B981" opacity="0.7"/>
    <rect x="100" y="44" width="60" height="8" rx="4" fill="rgba(255,255,255,0.1)"/>
    <rect x="52" y="72" width="75" height="50" rx="4" fill="#D8E4F8"/>
    <path d="M52 102 L72 82 L88 96 L100 86 L127 122" fill="#0A1E3F" opacity="0.08" stroke="none"/>
    <circle cx="72" cy="80" r="5" fill="#0A1E3F" opacity="0.3"/>
    <rect x="138" y="72" width="70" height="22" rx="3" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="138" y="100" width="70" height="8" rx="2" fill="#EEF1F6"/>
    <rect x="138" y="114" width="55" height="8" rx="2" fill="#EEF1F6"/>
    <rect x="75" y="130" width="110" height="18" rx="4" fill="#06B6D4" opacity="0.15"/>
    <text x="130" y="143" textAnchor="middle" fontSize="8" fill="#06B6D4" fontFamily="sans-serif" fontWeight="600">clade.ma</text>
  </svg>
)

const IlluAdmin = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="130" cy="85" r="45" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="130" cy="85" r="28" fill="white" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="130" cy="85" r="12" fill="#0A1E3F"/>
    <circle cx="130" cy="40" r="5" fill="#0A1E3F" opacity="0.3"/>
    <circle cx="130" cy="130" r="5" fill="#0A1E3F" opacity="0.3"/>
    <circle cx="85" cy="85" r="5" fill="#0A1E3F" opacity="0.3"/>
    <circle cx="175" cy="85" r="5" fill="#0A1E3F" opacity="0.3"/>
    <circle cx="99" cy="54" r="5" fill="#06B6D4" opacity="0.5"/>
    <circle cx="161" cy="54" r="5" fill="#06B6D4" opacity="0.5"/>
    <circle cx="99" cy="116" r="5" fill="#06B6D4" opacity="0.5"/>
    <circle cx="161" cy="116" r="5" fill="#06B6D4" opacity="0.5"/>
    <rect x="113" y="143" width="34" height="16" rx="4" fill="#0A1E3F"/>
    <rect x="122" y="140" width="16" height="6" rx="2" fill="#0A1E3F" stroke="#EEF1F6" strokeWidth="1"/>
    <circle cx="130" cy="152" r="2" fill="#06B6D4"/>
  </svg>
)

const IlluCollaborateurs = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="130" cy="90" r="14" fill="#0A1E3F"/>
    <circle cx="80" cy="55" r="12" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="180" cy="55" r="12" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="60" cy="120" r="12" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="200" cy="120" r="12" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <circle cx="130" cy="150" r="12" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <line x1="130" y1="90" x2="80" y2="55" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 3"/>
    <line x1="130" y1="90" x2="180" y2="55" stroke="#06B6D4" strokeWidth="1" strokeDasharray="4 3"/>
    <line x1="130" y1="90" x2="60" y2="120" stroke="#E4E8F0" strokeWidth="1" strokeDasharray="4 3"/>
    <line x1="130" y1="90" x2="200" y2="120" stroke="#E4E8F0" strokeWidth="1" strokeDasharray="4 3"/>
    <line x1="130" y1="90" x2="130" y2="150" stroke="#E4E8F0" strokeWidth="1" strokeDasharray="4 3"/>
    <circle cx="80" cy="53" r="4" fill="#0A1E3F"/>
    <circle cx="180" cy="53" r="4" fill="#0A1E3F"/>
  </svg>
)

const IlluDone = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <circle cx="130" cy="90" r="50" fill="#D8E4F8" opacity="0.5"/>
    <circle cx="130" cy="90" r="36" fill="#0A1E3F"/>
    <path d="M113 90 L124 101 L148 77" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    {[
      { x: 68, y: 48, r: 5, delay: 0 },
      { x: 192, y: 52, r: 4, delay: 0.1 },
      { x: 58, y: 130, r: 3.5, delay: 0.2 },
      { x: 200, y: 125, r: 4.5, delay: 0.15 },
      { x: 130, y: 30, r: 3, delay: 0.05 },
    ].map(({ x, y, r }, i) => (
      <circle key={i} cx={x} cy={y} r={r} fill="#06B6D4" opacity="0.7"/>
    ))}
    {[
      [80, 52, 88, 44], [192, 58, 200, 46], [62, 124, 54, 116],
      [196, 119, 204, 111], [130, 36, 130, 26],
    ].map(([x1, y1, x2, y2], i) => (
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#06B6D4" strokeWidth="1.5" opacity="0.5"/>
    ))}
    <text x="130" y="155" textAnchor="middle" fontSize="11" fill="#0A1E3F" fontWeight="600" fontFamily="sans-serif" letterSpacing="1">PRÊT !</text>
  </svg>
)

const IlluClientWelcome = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <path d="M70 140 L70 85 L130 50 L190 85 L190 140 Z" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <path d="M55 90 L130 48 L205 90" stroke="#0A1E3F" strokeWidth="2" strokeLinecap="round"/>
    <rect x="106" y="105" width="48" height="35" rx="2" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <circle cx="130" cy="118" r="6" fill="#3B82F6" opacity="0.4"/>
    <rect x="78" y="100" width="22" height="22" rx="2" fill="white" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="160" y="100" width="22" height="22" rx="2" fill="white" stroke="#E4E8F0" strokeWidth="1.5"/>
    <line x1="130" y1="48" x2="130" y2="38" stroke="#0A1E3F" strokeWidth="1.5"/>
    <rect x="122" y="28" width="16" height="12" rx="2" fill="#06B6D4" opacity="0.6"/>
    <circle cx="44" cy="100" r="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
    <circle cx="216" cy="95" r="5" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1"/>
  </svg>
)

const IlluLivrables = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="95" y="40" width="80" height="100" rx="4" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5" transform="rotate(-6 135 90)"/>
    <rect x="85" y="44" width="80" height="100" rx="4" fill="#F4F6FB" stroke="#E4E8F0" strokeWidth="1.5" transform="rotate(-3 125 94)"/>
    <rect x="80" y="48" width="80" height="100" rx="4" fill="white" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="92" y="64" width="55" height="5" rx="2.5" fill="#0A1E3F" opacity="0.6"/>
    <rect x="92" y="76" width="48" height="4" rx="2" fill="#6B7A99" opacity="0.3"/>
    <rect x="92" y="87" width="52" height="4" rx="2" fill="#6B7A99" opacity="0.3"/>
    <rect x="92" y="98" width="40" height="4" rx="2" fill="#6B7A99" opacity="0.3"/>
    <rect x="88" y="115" width="64" height="22" rx="4" fill="#0A1E3F"/>
    <text x="120" y="130" textAnchor="middle" fontSize="8" fill="white" fontFamily="sans-serif" letterSpacing="0.5">Télécharger</text>
    <path d="M120 126 L120 122 M116 124 L120 128 L124 124" stroke="#06B6D4" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const IlluDepenses = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="55" y="55" width="150" height="90" rx="8" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <rect x="55" y="55" width="150" height="28" rx="8" fill="#0A1E3F"/>
    <rect x="55" y="69" width="150" height="14" fill="#0A1E3F"/>
    <text x="130" y="73" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)" fontFamily="sans-serif">SUIVI DES DÉPENSES</text>
    <rect x="70" y="93" width="40" height="8" rx="2" fill="#6B7A99" opacity="0.3"/>
    <rect x="150" y="93" width="40" height="8" rx="2" fill="#3B82F6" opacity="0.3"/>
    <line x1="70" y1="108" x2="190" y2="108" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="70" y="113" width="50" height="6" rx="2" fill="#6B7A99" opacity="0.2"/>
    <rect x="155" y="113" width="35" height="6" rx="2" fill="#6B7A99" opacity="0.2"/>
    <rect x="70" y="125" width="45" height="6" rx="2" fill="#6B7A99" opacity="0.2"/>
    <rect x="155" y="125" width="35" height="6" rx="2" fill="#10B981" opacity="0.3"/>
    <rect x="70" y="137" width="55" height="6" rx="2" fill="#6B7A99" opacity="0.2"/>
    <rect x="155" y="137" width="35" height="6" rx="2" fill="#EF4444" opacity="0.3"/>
  </svg>
)

const IlluWorkflow = () => (
  <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
    <rect x="45" y="60" width="50" height="30" rx="6" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <text x="70" y="79" textAnchor="middle" fontSize="8" fill="#0A1E3F" fontFamily="sans-serif" fontWeight="600">Étape 1</text>
    <rect x="105" y="60" width="50" height="30" rx="6" fill="#D8E4F8" stroke="#3B82F6" strokeWidth="1.5"/>
    <text x="130" y="79" textAnchor="middle" fontSize="8" fill="#0A1E3F" fontFamily="sans-serif" fontWeight="600">Étape 2</text>
    <rect x="165" y="60" width="50" height="30" rx="6" fill="#EEF1F6" stroke="#E4E8F0" strokeWidth="1.5"/>
    <text x="190" y="79" textAnchor="middle" fontSize="8" fill="#6B7A99" fontFamily="sans-serif" fontWeight="600">Étape 3</text>
    <path d="M95 75 L105 75" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" markerEnd="url(#arr)"/>
    <path d="M155 75 L165 75" stroke="#E4E8F0" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="100" cy="75" r="2" fill="#06B6D4"/>
    <circle cx="160" cy="75" r="2" fill="#E4E8F0"/>
    <rect x="75" y="110" width="110" height="50" rx="6" fill="#0A1E3F" opacity="0.05" stroke="#E4E8F0" strokeWidth="1"/>
    <rect x="85" y="118" width="90" height="6" rx="2" fill="#0A1E3F" opacity="0.12"/>
    <rect x="85" y="129" width="70" height="6" rx="2" fill="#0A1E3F" opacity="0.08"/>
    <rect x="85" y="140" width="80" height="6" rx="2" fill="#0A1E3F" opacity="0.08"/>
    <circle cx="72" cy="87" r="12" fill="#06B6D4"/>
    <path d="M69 87 L71 89 L76 84" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Slide definitions ────────────────────────────────────────────────────────

const STAFF_SLIDES_BASE = [
  {
    id: 'welcome',
    category: 'Bienvenue',
    title: 'Votre tableau de bord CLADE',
    description: 'Gérez tous les aspects de votre agence d\'architecture depuis une interface centralisée et intuitive.',
    Illu: IlluWelcome,
    accent: '#0A1E3F',
  },
  {
    id: 'planning',
    category: 'Mon Espace',
    title: 'Mon Planning',
    description: 'Visualisez votre emploi du temps, commencez vos sessions de travail et suivez votre activité quotidienne.',
    Illu: IlluPlanning,
    accent: '#3B82F6',
  },
]

const CLIENT_SLIDES = [
  {
    id: 'welcome',
    category: 'Bienvenue',
    title: 'Votre espace projet CLADE',
    description: 'Suivez l\'avancement de votre projet en temps réel depuis votre espace personnel dédié.',
    Illu: IlluClientWelcome,
    accent: '#0A1E3F',
  },
  {
    id: 'project',
    category: 'Mon Projet',
    title: 'Suivi de projet',
    description: 'Consultez les détails de votre projet, son avancement et les informations clés de votre chantier.',
    Illu: IlluProjects,
    accent: '#3B82F6',
  },
  {
    id: 'concept',
    category: 'Concept',
    title: 'Vision & Concept',
    description: 'Découvrez les planches de concept, les inspirations et les orientations esthétiques de votre projet.',
    Illu: IlluPortfolio,
    accent: '#06B6D4',
  },
  {
    id: 'livrables',
    category: 'Livrables',
    title: 'Vos Documents',
    description: 'Retrouvez et téléchargez tous les plans, rendus et documents produits par notre équipe pour votre projet.',
    Illu: IlluLivrables,
    accent: '#3B82F6',
  },
  {
    id: 'depenses',
    category: 'Mes Dépenses',
    title: 'Suivi Financier',
    description: 'Consultez le détail de vos dépenses, les honoraires et l\'état financier de votre projet en toute transparence.',
    Illu: IlluDepenses,
    accent: '#0A1E3F',
  },
  {
    id: 'messages_client',
    category: 'Messages',
    title: 'Canal de Communication',
    description: 'Échangez directement et en temps réel avec notre équipe. Toutes vos conversations sont centralisées ici.',
    Illu: IlluMessages,
    accent: '#06B6D4',
  },
  {
    id: 'done',
    category: 'Prêt !',
    title: 'Votre espace est configuré',
    description: 'Vous pouvez maintenant naviguer dans votre espace projet. N\'hésitez pas à contacter notre équipe si vous avez des questions.',
    Illu: IlluDone,
    accent: '#0A1E3F',
  },
]

function buildStaffSlides({ isDirector, hasModule, hasMyProjects, hasTeam }) {
  const slides = [...STAFF_SLIDES_BASE]

  if (hasMyProjects || isDirector) {
    slides.push({
      id: 'my-projects',
      category: 'Mon Espace',
      title: 'Mes Projets',
      description: 'Accédez aux projets sur lesquels vous intervenez, consultez les tableaux de bord et les boards de tâches.',
      Illu: IlluProjects,
      accent: '#3B82F6',
    })
  }

  if (hasTeam || isDirector) {
    slides.push({
      id: 'team',
      category: 'Mon Espace',
      title: 'Mon Équipe',
      description: 'Visualisez les membres de votre équipe, leurs rôles et coordonnez efficacement votre collaboration.',
      Illu: IlluTeam,
      accent: '#0A1E3F',
    })
  }

  slides.push({
    id: 'workflow',
    category: 'Mon Espace',
    title: 'Mon Workflow',
    description: 'Organisez vos processus de travail, créez des notes de workflow et structurez votre méthodologie.',
    Illu: IlluWorkflow,
    accent: '#06B6D4',
  })

  if (hasModule('projects') || isDirector) {
    slides.push({
      id: 'projects',
      category: 'Gestion',
      title: 'Projets',
      description: 'Vue globale de tous les chantiers de l\'agence. Suivez les phases, les équipes et les jalons de chaque projet.',
      Illu: IlluProjects,
      accent: '#3B82F6',
    })
  }

  if (hasModule('hr') || isDirector) {
    slides.push({
      id: 'hr',
      category: 'Gestion',
      title: 'Ressources Humaines',
      description: 'Gérez les profils de vos collaborateurs, les contrats, les fiches de paie et le suivi des performances.',
      Illu: IlluHR,
      accent: '#0A1E3F',
    })
  }

  if (hasModule('finance') || isDirector) {
    slides.push({
      id: 'finance',
      category: 'Gestion',
      title: 'Finance',
      description: 'Pilotez la santé financière de l\'agence : entrées, sorties, budgets par projet et indicateurs clés.',
      Illu: IlluFinance,
      accent: '#3B82F6',
    })
  }

  if (hasModule('crm') || isDirector) {
    slides.push({
      id: 'crm',
      category: 'Gestion',
      title: 'Relations Clients',
      description: 'Gérez vos prospects et clients, suivez les opportunités commerciales et les rendez-vous.',
      Illu: IlluCRM,
      accent: '#06B6D4',
    })
  }

  if (hasModule('collaborateurs') || isDirector) {
    slides.push({
      id: 'collaborateurs',
      category: 'Gestion',
      title: 'Collaborateurs',
      description: 'Coordonnez avec vos partenaires externes, sous-traitants et entreprises avec qui vous collaborez.',
      Illu: IlluCollaborateurs,
      accent: '#0A1E3F',
    })
  }

  if (isDirector) {
    slides.push({
      id: 'portfolio',
      category: 'Gestion',
      title: 'Portfolio & Site Vitrine',
      description: 'Gérez le contenu de votre site clade.ma directement depuis le tableau de bord avec l\'éditeur visuel.',
      Illu: IlluPortfolio,
      accent: '#06B6D4',
    })
    slides.push({
      id: 'admin',
      category: 'Administration',
      title: 'Gestion des Accès',
      description: 'Créez des comptes utilisateurs, définissez les rôles et les permissions de chaque membre de l\'équipe.',
      Illu: IlluAdmin,
      accent: '#0A1E3F',
    })
  }

  slides.push({
    id: 'messages',
    category: 'Communication',
    title: 'Messages',
    description: 'Échangez avec vos collègues en messages directs ou groupes. La communication d\'équipe centralisée.',
    Illu: IlluMessages,
    accent: '#06B6D4',
  })

  slides.push({
    id: 'done',
    category: 'Prêt !',
    title: 'Vous êtes prêt(e)',
    description: 'Votre espace de travail est configuré. Explorez chaque section à votre rythme et bonne journée !',
    Illu: IlluDone,
    accent: '#0A1E3F',
  })

  return slides
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingGuide() {
  const { profile, isClient, isDirector } = useAuth()
  const { employes, projects } = useData()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (!profile) return
    const key = STORAGE_KEY(profile.id)
    if (!localStorage.getItem(key)) {
      // Slight delay so layout finishes rendering first
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [profile])

  const slides = useMemo(() => {
    if (!profile) return []
    if (isClient) return CLIENT_SLIDES

    const myEmpId = String(profile.employe_id || profile.id || '')
    const emp = employes.find(e => String(e.id) === myEmpId)
    const modulesArr = emp?.permissions?.modules
    const hasModule = (mod) => !modulesArr || modulesArr.includes(mod)

    const hasMyProjects = projects.some(p =>
      String(p.architecteReferentId) === myEmpId ||
      (p.equipeProjet || []).map(String).includes(myEmpId)
    )
    const hasTeam = projects.some(p => {
      const equipeIds = (p.equipeProjet || []).map(String)
      if (String(p.architecteReferentId) === myEmpId) return equipeIds.length > 0
      return equipeIds.includes(myEmpId) && equipeIds.some(id => id !== myEmpId)
    })

    return buildStaffSlides({ isDirector, hasModule, hasMyProjects, hasTeam })
  }, [profile, isClient, isDirector, employes, projects])

  const close = () => {
    if (profile) localStorage.setItem(STORAGE_KEY(profile.id), '1')
    setVisible(false)
  }

  const go = (next) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const prev = () => { if (step > 0) go(step - 1) }
  const next = () => {
    if (step < slides.length - 1) go(step + 1)
    else close()
  }

  if (!visible || slides.length === 0) return null

  const slide = slides[step]
  const { Illu } = slide
  const isLast = step === slides.length - 1

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6, 21, 48, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'rgba(250, 251, 253, 0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 32px 80px rgba(6, 21, 48, 0.25), 0 0 0 1px rgba(228, 232, 240, 0.6)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Header bar with gradient */}
            <div style={{
              height: 4,
              background: 'linear-gradient(90deg, #0A1E3F 0%, #06B6D4 50%, #3B82F6 100%)',
            }} />

            {/* Close button */}
            <button
              onClick={close}
              style={{
                position: 'absolute', top: 18, right: 18, zIndex: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(107, 122, 153, 0.1)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7A99', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(107, 122, 153, 0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(107, 122, 153, 0.1)'}
            >
              <X size={15} />
            </button>

            {/* Illustration area */}
            <div style={{
              height: 200,
              background: 'linear-gradient(135deg, #EEF1F6 0%, #F4F6FB 60%, rgba(216, 228, 248, 0.4) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px 40px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Subtle grid pattern */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'radial-gradient(rgba(10, 30, 63, 0.06) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
                >
                  <Illu />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Content */}
            <div style={{ padding: '28px 36px 24px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + '_content'}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: 20, padding: '3px 10px',
                    marginBottom: 12,
                  }}>
                    <Sparkles size={10} style={{ color: '#06B6D4' }} />
                    <span style={{
                      fontFamily: 'Inter Tight, sans-serif',
                      fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
                      textTransform: 'uppercase', color: '#06B6D4',
                    }}>
                      {slide.category}
                    </span>
                  </div>

                  <h2 style={{
                    fontFamily: 'Instrument Serif, Georgia, serif',
                    fontSize: 26, fontWeight: 400, color: '#0A1E3F',
                    margin: '0 0 10px', lineHeight: 1.2, letterSpacing: -0.3,
                  }}>
                    {slide.title}
                  </h2>

                  <p style={{
                    fontFamily: 'Inter Tight, -apple-system, sans-serif',
                    fontSize: 14, lineHeight: 1.7, color: '#6B7A99',
                    margin: '0 0 28px',
                  }}>
                    {slide.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                {/* Dot indicators */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => go(i)}
                      style={{
                        width: i === step ? 20 : 6,
                        height: 6, borderRadius: 3,
                        background: i === step ? '#0A1E3F' : 'rgba(10, 30, 63, 0.15)',
                        border: 'none', cursor: 'pointer', padding: 0,
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {step > 0 && (
                    <button
                      onClick={prev}
                      style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'transparent',
                        border: '1.5px solid #E4E8F0',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#6B7A99', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0A1E3F'; e.currentTarget.style.color = '#0A1E3F' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E4E8F0'; e.currentTarget.style.color = '#6B7A99' }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}

                  {!isLast && (
                    <button
                      onClick={close}
                      style={{
                        padding: '0 16px', height: 38, borderRadius: 10,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontFamily: 'Inter Tight, sans-serif', fontSize: 13, color: '#6B7A99',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#0A1E3F'}
                      onMouseLeave={e => e.currentTarget.style.color = '#6B7A99'}
                    >
                      Passer
                    </button>
                  )}

                  <button
                    onClick={next}
                    style={{
                      padding: isLast ? '0 22px' : '0', width: isLast ? 'auto' : 38,
                      height: 38, borderRadius: 10,
                      background: '#0A1E3F', border: 'none', cursor: 'pointer',
                      fontFamily: 'Inter Tight, sans-serif', fontSize: 13, fontWeight: 600,
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'background 0.2s, transform 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1B3260'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0A1E3F'}
                  >
                    {isLast ? (
                      <>Commencer <Sparkles size={13} /></>
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Step counter */}
              <div style={{
                textAlign: 'center', marginTop: 16,
                fontFamily: 'Inter Tight, sans-serif', fontSize: 11, color: 'rgba(107, 122, 153, 0.5)',
              }}>
                {step + 1} / {slides.length}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
