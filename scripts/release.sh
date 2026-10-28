#!/usr/bin/env bash
# انتشار Release در گیت‌هاب — توکن از متغیر محیطی GITHUB_TOKEN خوانده می‌شود (هرگز در کد نگذارید)
# اجرا: GITHUB_TOKEN=<توکن شما> bash scripts/release.sh <tag> <مسیر APK> <عنوان>
set -e
PAT="${GITHUB_TOKEN:?GITHUB_TOKEN تنظیم نشده}"
REPO="Mhabib70/bashar-news-agency"
TAG="${1:?tag مثل v1.2.0}"
APK="${2:?مسیر APK}"
TITLE="${3:?عنوان Release}"

NOTES_FILE="${4:-/dev/stdin}"
if [ "$NOTES_FILE" = "/dev/stdin" ]; then
  echo "متن Release را وارد کنید و Ctrl+D بزنید:"
fi
BODY=$(cat "$NOTES_FILE")

echo "[1/3] ساخت Release..."
REL=$(TAG="$TAG" TITLE="$TITLE" NOTES="$NOTES_FILE" node -e "
const fs = require('fs');
const payload = JSON.stringify({ tag_name: process.env.TAG, target_commitish: 'main', name: process.env.TITLE, body: fs.readFileSync(process.env.NOTES, 'utf8'), draft: false, prerelease: false });
console.log(payload);
" 2>/dev/null | curl -s -X POST -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
  -d @- "https://api.github.com/repos/$REPO/releases")
REL_ID=$(echo "$REL" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d); if(j.id){console.log(j.id)}else{console.error('ERR',JSON.stringify(j).slice(0,300));process.exit(1)}})")
echo "RELEASE_ID=$REL_ID"

echo "[2/3] آپلود APK..."
NAME=$(basename "$APK")
UP=$(curl -s -X POST -H "Authorization: Bearer $PAT" -H "Content-Type: application/vnd.android.package-archive" \
  --data-binary @"$APK" "https://uploads.github.com/repos/$REPO/releases/$REL_ID/assets?name=$NAME")
echo "$UP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.state==='uploaded'?'UPLOAD_OK':'UPLOAD_ERR', j.browser_download_url||JSON.stringify(j).slice(0,200))})"

echo "[3/3] انتشار..."
curl -s -X PATCH -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
  -d '{"draft":false}' "https://api.github.com/repos/$REPO/releases/$REL_ID" > /dev/null
echo "RELEASE_PUBLISHED: https://github.com/$REPO/releases/tag/$TAG"
