#!/usr/bin/env sh
# Migrate local private storage into an S3-compatible bucket (MinIO / AWS).
#
# Usage:
#   AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_BUCKET=gmora \
#   AWS_ENDPOINT=http://localhost:9000 AWS_USE_PATH_STYLE_ENDPOINT=true \
#   ./deploy/scripts/migrate-storage-to-s3.sh
#
# Requires: aws CLI v2
set -eu

ROOT="${1:-storage/app/private}"
PREFIX="${S3_PREFIX:-app/private}"
BUCKET="${AWS_BUCKET:?AWS_BUCKET is required}"

ENDPOINT_ARGS=""
if [ -n "${AWS_ENDPOINT:-}" ]; then
  ENDPOINT_ARGS="--endpoint-url ${AWS_ENDPOINT}"
fi

if [ "${AWS_USE_PATH_STYLE_ENDPOINT:-false}" = "true" ]; then
  # aws cli uses path-style automatically for custom endpoints in most versions
  true
fi

echo "Syncing ${ROOT} -> s3://${BUCKET}/${PREFIX}/"
aws s3 sync "${ROOT}" "s3://${BUCKET}/${PREFIX}/" ${ENDPOINT_ARGS} --only-show-errors

PUBLIC_ROOT="${2:-storage/app/public}"
PUBLIC_PREFIX="${S3_PUBLIC_PREFIX:-app/public}"
if [ -d "${PUBLIC_ROOT}" ]; then
  echo "Syncing ${PUBLIC_ROOT} -> s3://${BUCKET}/${PUBLIC_PREFIX}/"
  aws s3 sync "${PUBLIC_ROOT}" "s3://${BUCKET}/${PUBLIC_PREFIX}/" ${ENDPOINT_ARGS} --only-show-errors
fi

echo "Done. Set FILESYSTEM_CLOUD=s3 and matching AWS_* env vars on the app."
