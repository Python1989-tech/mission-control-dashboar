$path = "../app/page.tsx"
$old = @"
        .floor-avatar {
          position: absolute;
          width: 150px;
          padding: 8px 10px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(2, 6, 23, 0.9);
          display: flex;
          gap: 8px;
          align-items: center;
          transition: transform 1.2s ease, border-color 0.3s ease;
          cursor: pointer;
        }
        .floor-avatar__portrait {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          overflow: hidden;
        }
        .floor-avatar__portrait img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .floor-avatar__name {
          font-weight: 600;
          font-size: 13px;
        }
        .floor-avatar__task {
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.4;
        }
        .floor-avatar__tag {
          margin-top: 4px;
          font-size: 10px;
          color: #22d3ee;
          letter-spacing: 0.08em;
        }
        .floor-avatar--command { border-color: rgba(94, 234, 212, 0.5); }
        .floor-avatar--analysis { border-color: rgba(56, 189, 248, 0.5); animation: pulseBlue 2.2s infinite; }
        .floor-avatar--development { border-color: rgba(34, 197, 94, 0.5); animation: pulseGreen 2s infinite; }
        .floor-avatar--creative { border-color: rgba(249, 115, 22, 0.5); animation: pulseRed 2.4s infinite; }
        .floor-avatar--deployment { border-color: rgba(250, 204, 21, 0.5); animation: pulseCyan 2.4s infinite; }
        .floor-avatar--idle { border-color: rgba(148, 163, 184, 0.4); }
"@

$new = @"
        .floor-avatar {
          position: absolute;
          width: 90px;
          padding: 8px 6px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(1, 8, 24, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
          cursor: pointer;
          transition: transform 1.2s ease, border-color 0.3s ease;
        }
        .floor-avatar__nameplate {
          font-size: 11px;
          font-weight: 600;
          color: #e2e8f0;
          text-transform: uppercase;
        }
        .floor-avatar__sprite {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(15, 23, 42, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .floor-avatar__sprite img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          filter: saturate(1.1);
        }
        .floor-avatar__base {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 12px;
          border-radius: 999px;
          background: rgba(94, 234, 212, 0.35);
        }
        .floor-avatar__task {
          font-size: 11px;
          color: #94a3b8;
        }
        .floor-avatar__tag {
          font-size: 10px;
          color: #22d3ee;
          letter-spacing: 0.08em;
        }
        .floor-avatar--command { border-color: rgba(94, 234, 212, 0.5); }
        .floor-avatar--analysis { border-color: rgba(56, 189, 248, 0.5); }
        .floor-avatar--development { border-color: rgba(34, 197, 94, 0.5); }
        .floor-avatar--creative { border-color: rgba(249, 115, 22, 0.5); }
        .floor-avatar--deployment { border-color: rgba(250, 204, 21, 0.5); }
        .floor-avatar--analysis .floor-avatar__base { background: rgba(56, 189, 248, 0.45); }
        .floor-avatar--development .floor-avatar__base { background: rgba(34, 197, 94, 0.45); }
        .floor-avatar--creative .floor-avatar__base { background: rgba(249, 115, 22, 0.45); }
        .floor-avatar--deployment .floor-avatar__base { background: rgba(250, 204, 21, 0.45); }
        .floor-avatar--idle { border-color: rgba(148, 163, 184, 0.4); }
        .floor-avatar--idle .floor-avatar__base { background: rgba(148, 163, 184, 0.4); }
"@

(Get-Content $path -Raw).Replace($old, $new) | Set-Content $path -Encoding UTF8
