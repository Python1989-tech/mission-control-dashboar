$path = "../app/page.tsx"
$old = @"
        .floor-avatar__sprite img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          filter: saturate(1.1);
        }
"@
$new = @"
        .floor-avatar__sprite img {
          width: 56px;
          height: 56px;
          object-fit: cover;
          filter: saturate(1.2);
        }
"@
(Get-Content $path -Raw).Replace($old, $new) | Set-Content $path -Encoding UTF8
