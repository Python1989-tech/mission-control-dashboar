$path = "../app/page.tsx"
$old = @"
        .floor-desk {
          position: absolute;
          width: 110px;
          height: 60px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          background: rgba(15, 23, 42, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #94a3b8;
        }
        .floor-desk::before {
          content: "";
          position: absolute;
          top: 10px;
          width: 50px;
          height: 12px;
          border-radius: 4px;
          background: rgba(56, 189, 248, 0.25);
        }
        .floor-desk::after {
          content: "";
          position: absolute;
          bottom: 6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(148, 163, 184, 0.2);
        }
        .floor-desk span {
          position: relative;
          z-index: 1;
        }
        .floor-desk--ceo {
          border-color: rgba(94, 234, 212, 0.4);
          background: rgba(6, 78, 59, 0.45);
          font-weight: 600;
          color: #f8fafc;
        }
        .floor-desk--ceo::before {
          background: rgba(94, 234, 212, 0.35);
          width: 60px;
        }
        .floor-desk--ceo::after {
          background: rgba(94, 234, 212, 0.25);
        }
"@

$new = @"
        .floor-desk {
          position: absolute;
          width: 110px;
          height: 58px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #94a3b8;
        }
        .floor-desk::before {
          content: "";
          position: absolute;
          top: 8px;
          width: 48px;
          height: 14px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.2);
        }
        .floor-desk::after {
          content: "";
          position: absolute;
          bottom: 6px;
          width: 30px;
          height: 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.95);
        }
        .floor-desk span {
          position: relative;
          z-index: 1;
        }
        .floor-desk--ceo {
          border-color: rgba(94, 234, 212, 0.5);
          background: rgba(6, 78, 59, 0.4);
          color: #f8fafc;
          font-weight: 600;
        }
        .floor-desk--ceo::before {
          background: rgba(94, 234, 212, 0.3);
          width: 60px;
        }
        .floor-desk--ceo::after {
          background: rgba(94, 234, 212, 0.3);
        }
"@

(Get-Content $path -Raw).Replace($old, $new) | Set-Content $path -Encoding UTF8
