$path = "../app/page.tsx"
$old = @"
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
"@
$new = @"
        .floor-avatar__sprite {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(148, 163, 184, 0.5);
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(15,23,42,0.9));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 14px rgba(0,0,0,0.45);
        }
"@
(Get-Content $path -Raw).Replace($old, $new) | Set-Content $path -Encoding UTF8
