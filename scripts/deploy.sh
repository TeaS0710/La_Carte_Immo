#!/usr/bin/env bash
# scripts/deploy.sh — Déploiement de La Carte Prelys sur Cloudflare Pages.
#
# Usage :
#   ./scripts/deploy.sh                       # Deploy production (branche main)
#   ./scripts/deploy.sh --preview             # Deploy en preview (URL éphémère)
#   ./scripts/deploy.sh --skip-build          # Re-deploy sans rebuild Next.js
#   ./scripts/deploy.sh --rotate-password     # Régénère et applique un nouveau mot de passe
#   ./scripts/deploy.sh --public              # Toggle accès public (désactive Basic Auth)
#   ./scripts/deploy.sh --private             # Toggle accès privé (réactive Basic Auth)
#   ./scripts/deploy.sh --help
#
# Pré-requis :
#   - npm + node 20+
#   - wrangler (npm install -g wrangler) authentifié (wrangler login)
#
# Variables d'environnement optionnelles :
#   PROJECT_NAME      — nom du projet Cloudflare Pages (défaut : "la-carte-immo")
#   SITE_URL          — URL publique pour sitemap.xml/openGraph (défaut : "https://la-carte-immo.pages.dev")
#   CREDENTIALS_FILE  — fichier local où sauvegarder le password (défaut : ".credentials.local")

set -euo pipefail

# ── Couleurs ────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  CL_RST=$'\e[0m'; CL_OK=$'\e[1;32m'; CL_WARN=$'\e[1;33m'; CL_ERR=$'\e[1;31m'; CL_INFO=$'\e[1;36m'; CL_DIM=$'\e[2m'
else
  CL_RST=""; CL_OK=""; CL_WARN=""; CL_ERR=""; CL_INFO=""; CL_DIM=""
fi
log()  { echo "${CL_INFO}▸${CL_RST} $*"; }
ok()   { echo "${CL_OK}✓${CL_RST} $*"; }
warn() { echo "${CL_WARN}⚠${CL_RST} $*"; }
err()  { echo "${CL_ERR}✗${CL_RST} $*" >&2; }
die()  { err "$*"; exit 1; }

# ── Config ──────────────────────────────────────────────────────────────────
PROJECT_NAME="${PROJECT_NAME:-la-carte-immo}"
SITE_URL="${SITE_URL:-https://la-carte-immo.pages.dev}"
CREDENTIALS_FILE="${CREDENTIALS_FILE:-.credentials.local}"
BRANCH="main"
SKIP_BUILD=false
ROTATE_PASSWORD=false
TOGGLE_PUBLIC=""

# ── Parse args ──────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --preview)           BRANCH="preview-$(date +%Y%m%d-%H%M%S)"; shift ;;
    --skip-build)        SKIP_BUILD=true; shift ;;
    --rotate-password)   ROTATE_PASSWORD=true; shift ;;
    --public)            TOGGLE_PUBLIC="true"; shift ;;
    --private)           TOGGLE_PUBLIC="false"; shift ;;
    --help|-h)
      grep -E '^# ' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) die "Argument inconnu : $1 (utilise --help)" ;;
  esac
done

cd "$(dirname "$0")/.."   # racine du repo

# ── Pré-requis ──────────────────────────────────────────────────────────────
log "Vérification des pré-requis…"
command -v npm >/dev/null || die "npm introuvable"
command -v wrangler >/dev/null || die "wrangler introuvable (npm install -g wrangler)"

if ! wrangler whoami >/dev/null 2>&1; then
  die "wrangler n'est pas authentifié — lance d'abord 'wrangler login'"
fi
ok "wrangler OK (compte $(wrangler whoami 2>&1 | grep -oE 'associated with the email [^.]*' || echo '???'))"

# ── Build Next.js (sauf si --skip-build) ────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  log "Build Next.js (NEXT_PUBLIC_BASE_PATH='' NEXT_PUBLIC_SITE_URL='$SITE_URL')…"
  NEXT_PUBLIC_BASE_PATH="" NEXT_PUBLIC_SITE_URL="$SITE_URL" npm run build >/tmp/deploy-build.log 2>&1 \
    || { tail -30 /tmp/deploy-build.log; die "build échoué (voir /tmp/deploy-build.log)"; }

  files=$(find out -type f 2>/dev/null | wc -l)
  size=$(du -sh out 2>/dev/null | cut -f1)
  ok "Build OK : $files fichiers, $size dans out/"
else
  [ -d "out" ] || die "--skip-build mais out/ n'existe pas. Lance d'abord un build."
  ok "Build sauté (out/ existant utilisé)"
fi

# ── Copy functions/ dans out/ (Wrangler les bundle côté Pages) ──────────────
if [ -d "functions" ]; then
  log "Copy functions/ dans out/ (middleware Basic Auth)…"
  rm -rf out/functions
  cp -r functions out/
  ok "functions/ copiées (Basic Auth middleware actif)"
else
  warn "Pas de dossier functions/ → site sera servi sans middleware (PUBLIC)"
fi

# ── Toggle public/private (avant deploy pour éviter de re-déclencher) ───────
if [ -n "$TOGGLE_PUBLIC" ]; then
  if [ "$TOGGLE_PUBLIC" = "true" ]; then
    log "Activation du mode PUBLIC (PUBLIC_ACCESS=true)…"
    echo "true" | wrangler pages secret put PUBLIC_ACCESS --project-name="$PROJECT_NAME" >/dev/null
    ok "Site désormais public (pas de Basic Auth)"
  else
    log "Activation du mode PRIVÉ (PUBLIC_ACCESS retiré)…"
    wrangler pages secret delete PUBLIC_ACCESS --project-name="$PROJECT_NAME" >/dev/null 2>&1 \
      || warn "PUBLIC_ACCESS n'était pas défini — déjà privé"
    ok "Site désormais privé (Basic Auth requis)"
  fi
fi

# ── Rotation password ──────────────────────────────────────────────────────
if [ "$ROTATE_PASSWORD" = true ]; then
  NEW_PASS=$(python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20)))")
  log "Rotation du mot de passe…"
  echo "$NEW_PASS" | wrangler pages secret put BASIC_AUTH_PASS --project-name="$PROJECT_NAME" >/dev/null
  ok "Nouveau mot de passe configuré"

  # Sauvegarde locale
  if [ -f "$CREDENTIALS_FILE" ]; then
    sed -i.bak "s/^Password: .*/Password: $NEW_PASS/" "$CREDENTIALS_FILE"
    rm -f "${CREDENTIALS_FILE}.bak"
    ok "Credentials mises à jour dans $CREDENTIALS_FILE"
  else
    cat > "$CREDENTIALS_FILE" << EOF
URL: $SITE_URL/
Username: prelys
Password: $NEW_PASS
EOF
    ok "Credentials créées dans $CREDENTIALS_FILE"
  fi
  echo
  echo "${CL_WARN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL_RST}"
  echo "Nouveau mot de passe : ${CL_OK}$NEW_PASS${CL_RST}"
  echo "${CL_WARN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL_RST}"
fi

# ── Deploy ──────────────────────────────────────────────────────────────────
log "Déploiement sur Cloudflare Pages ($PROJECT_NAME / branche $BRANCH)…"
DEPLOY_OUT=$(mktemp)
trap 'rm -f "$DEPLOY_OUT"' EXIT

if wrangler pages deploy ./out \
    --project-name="$PROJECT_NAME" \
    --branch="$BRANCH" \
    --commit-dirty=true \
    --commit-message="deploy $(date -u +%Y-%m-%dT%H:%M:%SZ) — $(git rev-parse --short HEAD 2>/dev/null || echo 'no-git')" \
    2>&1 | tee "$DEPLOY_OUT"; then
  ok "Deploy réussi"
else
  die "Deploy échoué (voir output ci-dessus)"
fi

# ── Récap final ─────────────────────────────────────────────────────────────
DEPLOY_URL=$(grep -oE 'https://[a-z0-9]+\.[a-z0-9-]+\.pages\.dev' "$DEPLOY_OUT" | head -1)
echo
echo "${CL_OK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL_RST}"
ok "Site live : $SITE_URL"
[ -n "${DEPLOY_URL:-}" ] && log "Preview URL : ${CL_DIM}$DEPLOY_URL${CL_RST}"
if [ -f "$CREDENTIALS_FILE" ] && [ -z "${TOGGLE_PUBLIC:-}" -o "$TOGGLE_PUBLIC" = "false" ]; then
  echo
  log "Credentials Basic Auth : voir ${CL_INFO}$CREDENTIALS_FILE${CL_RST}"
fi
echo "${CL_OK}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${CL_RST}"
