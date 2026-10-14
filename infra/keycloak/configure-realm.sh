#!/bin/bash
set -euo pipefail

SERVER="${KEYCLOAK_SERVER:-http://keycloak:8080}"
REALM=cca
KCADM=(/opt/keycloak/bin/kcadm.sh)

if [ -z "${KC_BOOTSTRAP_ADMIN_USERNAME:-}" ] || [ -z "${KC_BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "KC_BOOTSTRAP_ADMIN_USERNAME and KC_BOOTSTRAP_ADMIN_PASSWORD are required" >&2
  exit 1
fi
if [ -z "${CCA_DEV_USER:-}" ] || [ -z "${CCA_DEV_USER_PASSWORD:-}" ]; then
  echo "CCA_DEV_USER and CCA_DEV_USER_PASSWORD are required" >&2
  exit 1
fi
if [ -z "${KEYCLOAK_PROVISIONER_CLIENT_SECRET:-}" ]; then
  echo "KEYCLOAK_PROVISIONER_CLIENT_SECRET is required" >&2
  exit 1
fi

"${KCADM[@]}" config credentials \
  --server "$SERVER" \
  --realm master \
  --user "$KC_BOOTSTRAP_ADMIN_USERNAME" \
  --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"

if ! "${KCADM[@]}" get "realms/${REALM}" >/dev/null 2>&1; then
  "${KCADM[@]}" create realms \
    -s realm="$REALM" \
    -s enabled=true \
    -s displayName="Central de Controle de Acessos" \
    -s sslRequired=NONE \
    -s registrationAllowed=false \
    -s resetPasswordAllowed=true \
    -s loginWithEmailAllowed=true \
    -s editUsernameAllowed=true
fi

"${KCADM[@]}" update "realms/${REALM}" \
  -s sslRequired=NONE \
  -s registrationAllowed=false \
  -s resetPasswordAllowed=true \
  -s loginWithEmailAllowed=true \
  -s editUsernameAllowed=true

client_uuid() {
  local output line uuid=""
  output="$("${KCADM[@]}" get clients -r "$REALM" -q "clientId=${1}" --fields id --format csv --noquotes || true)"
  output="${output//$'\r'/}"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    [ "$line" = "id" ] && continue
    uuid="$line"
    break
  done <<< "$output"
  printf '%s' "$uuid"
}

ensure_client() {
  local client_id="$1"
  shift
  local id
  id="$(client_uuid "$client_id")"
  if [ -z "$id" ]; then
    "${KCADM[@]}" create clients -r "$REALM" -s "clientId=${client_id}" "$@" >/dev/null
    id="$(client_uuid "$client_id")"
  else
    "${KCADM[@]}" update "clients/${id}" -r "$REALM" "$@" >/dev/null
  fi
  if [ -z "$id" ]; then
    echo "Could not resolve client ${client_id}" >&2
    exit 1
  fi
  printf '%s' "$id"
}

api_id="$(ensure_client cca-api \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=true \
  -s standardFlowEnabled=false \
  -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=false \
  -s serviceAccountsEnabled=false)"

web_id="$(ensure_client cca-web \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=true \
  -s standardFlowEnabled=true \
  -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=false \
  -s serviceAccountsEnabled=false \
  -s 'redirectUris=["http://127.0.0.1:4173/callback","http://localhost:4173/callback"]' \
  -s 'webOrigins=["http://127.0.0.1:4173","http://localhost:4173"]' \
  -s 'attributes."pkce.code.challenge.method"=S256')"

if ! "${KCADM[@]}" get "clients/${web_id}/protocol-mappers/models" -r "$REALM" | grep -q 'cca-api-audience'; then
  "${KCADM[@]}" create "clients/${web_id}/protocol-mappers/models" -r "$REALM" \
    -s name=cca-api-audience \
    -s protocol=openid-connect \
    -s protocolMapper=oidc-audience-mapper \
    -s 'config."included.client.audience"=cca-api' \
    -s 'config."access.token.claim"=true' \
    -s 'config."id.token.claim"=false' >/dev/null
fi

provisioner_id="$(ensure_client cca-provisioner \
  -s enabled=true \
  -s protocol=openid-connect \
  -s publicClient=false \
  -s clientAuthenticatorType=client-secret \
  -s "secret=${KEYCLOAK_PROVISIONER_CLIENT_SECRET}" \
  -s standardFlowEnabled=false \
  -s implicitFlowEnabled=false \
  -s directAccessGrantsEnabled=false \
  -s serviceAccountsEnabled=true)"

sa_user="service-account-cca-provisioner"
for _ in 1 2 3 4 5; do
  if "${KCADM[@]}" get users -r "$REALM" -q "username=${sa_user}" --fields username --format csv --noquotes | grep -q "$sa_user"; then
    break
  fi
  sleep 1
done

"${KCADM[@]}" add-roles -r "$REALM" --uusername "$sa_user" --cclientid realm-management --rolename manage-users --rolename view-users --rolename query-users

user_output="$("${KCADM[@]}" get users -r "$REALM" -q "username=${CCA_DEV_USER}" --fields id --format csv --noquotes || true)"
user_output="${user_output//$'\r'/}"
user_id=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  [ "$line" = "id" ] && continue
  user_id="$line"
  break
done <<< "$user_output"
if [ -z "$user_id" ]; then
  "${KCADM[@]}" create users -r "$REALM" \
    -s "username=${CCA_DEV_USER}" \
    -s "email=${CCA_DEV_USER}@datasite.local" \
    -s emailVerified=true \
    -s enabled=true \
    -s firstName=Dev \
    -s lastName=User >/dev/null
fi

"${KCADM[@]}" set-password -r "$REALM" --username "$CCA_DEV_USER" --new-password "$CCA_DEV_USER_PASSWORD" >/dev/null

echo "Realm ${REALM} ready. Clients: cca-web (${web_id}), cca-api (${api_id}), cca-provisioner (${provisioner_id}). Dev user: ${CCA_DEV_USER}."
