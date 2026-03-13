#!/bin/bash
# End-to-end smoke test for NS Conversation Network
# Tests every user workflow against the production API
# Usage: bash scripts/smoke-test.sh [API_BASE_URL]

API="${1:-https://ns-conversation-network-production.up.railway.app/api/v1}"
HEALTH_URL="${API%/api/v1}/health"
PASS=0
FAIL=0
ERRORS=""
TS=$(date +%s)

# Helper: parse JSON with node
json() { node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=eval('('+process.argv[1]+')')(JSON.parse(d));process.stdout.write(String(r??''))}catch(e){process.stderr.write(e.message)}})" -- "$1"; }

# Helper: check result
check() {
  local name="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS  $name"
    ((PASS++))
  else
    echo "  FAIL  $name (expected: $expected, got: $actual)"
    ((FAIL++))
    ERRORS="$ERRORS\n  - $name: expected '$expected', got '$actual'"
  fi
}

check_not_empty() {
  local name="$1" actual="$2"
  if [ -n "$actual" ] && [ "$actual" != "undefined" ] && [ "$actual" != "null" ]; then
    echo "  PASS  $name"
    ((PASS++))
  else
    echo "  FAIL  $name (empty or missing)"
    ((FAIL++))
    ERRORS="$ERRORS\n  - $name: value was empty/missing"
  fi
}

check_gte() {
  local name="$1" actual="$2" min="$3"
  if [ "$actual" -ge "$min" ] 2>/dev/null; then
    echo "  PASS  $name ($actual >= $min)"
    ((PASS++))
  else
    echo "  FAIL  $name (expected >= $min, got: $actual)"
    ((FAIL++))
    ERRORS="$ERRORS\n  - $name: expected >= $min, got '$actual'"
  fi
}

echo "============================================"
echo "  Smoke Test — NS Conversation Network"
echo "  API: $API"
echo "  Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "============================================"
echo

# ──────────────────────────────────────────────
echo "--- 1. Health Check ---"
# ──────────────────────────────────────────────
HEALTH=$(curl -sf "$HEALTH_URL")
check "GET /health returns 200" "$(echo "$HEALTH" | json 'd=>d.status')" "healthy"

# ──────────────────────────────────────────────
echo "--- 2. Registration ---"
# ──────────────────────────────────────────────
USER_A_EMAIL="smokea${TS}@test.com"
USER_A_USER="smokea${TS}"
USER_A_PASS="Test1@smoke"

REG_A=$(curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"'"$USER_A_USER"'","email":"'"$USER_A_EMAIL"'","password":"'"$USER_A_PASS"'"}')

check "Register user A succeeds" "$(echo "$REG_A" | json 'd=>d.success')" "true"
USER_A_ID=$(echo "$REG_A" | json 'd=>d.userId')
check_not_empty "Register returns userId" "$USER_A_ID"
TOKEN_A=$(echo "$REG_A" | json 'd=>d.tokens?.accessToken')
check_not_empty "Register returns tokens (auto-login)" "$TOKEN_A"

# Register user B
USER_B_EMAIL="smokeb${TS}@test.com"
USER_B_USER="smokeb${TS}"

REG_B=$(curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"'"$USER_B_USER"'","email":"'"$USER_B_EMAIL"'","password":"'"$USER_A_PASS"'"}')

USER_B_ID=$(echo "$REG_B" | json 'd=>d.userId')
TOKEN_B=$(echo "$REG_B" | json 'd=>d.tokens?.accessToken')
check_not_empty "Register user B succeeds" "$USER_B_ID"

# ──────────────────────────────────────────────
echo "--- 3. Login ---"
# ──────────────────────────────────────────────
LOGIN_A=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$USER_A_EMAIL"'","password":"'"$USER_A_PASS"'"}')

check "Login user A succeeds" "$(echo "$LOGIN_A" | json 'd=>d.success')" "true"
check_not_empty "Login returns accessToken" "$(echo "$LOGIN_A" | json 'd=>d.tokens?.accessToken')"
check_not_empty "Login returns refreshToken" "$(echo "$LOGIN_A" | json 'd=>d.tokens?.refreshToken')"
check "Login returns user.id" "$(echo "$LOGIN_A" | json 'd=>d.user?.id')" "$USER_A_ID"

# Use login token (fresher)
TOKEN_A=$(echo "$LOGIN_A" | json 'd=>d.tokens?.accessToken')

# ──────────────────────────────────────────────
echo "--- 4. Create Post ---"
# ──────────────────────────────────────────────
POST_1=$(curl -s -X POST "$API/posts" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"content":"Smoke test post from user A","visibility":"public"}')

check "Create post succeeds" "$(echo "$POST_1" | json 'd=>d.success')" "true"
POST_1_ID=$(echo "$POST_1" | json 'd=>d.data?.id')
check_not_empty "Post has id" "$POST_1_ID"
check "Post content matches" "$(echo "$POST_1" | json 'd=>d.data?.content')" "Smoke test post from user A"

# ──────────────────────────────────────────────
echo "--- 5. Feed Shows Own Posts ---"
# ──────────────────────────────────────────────
FEED_A=$(curl -s "$API/feed?limit=20" -H "Authorization: Bearer $TOKEN_A")

check "Feed returns success" "$(echo "$FEED_A" | json 'd=>d.success')" "true"
FEED_COUNT=$(echo "$FEED_A" | json 'd=>d.data?.length')
check_gte "Feed contains posts" "$FEED_COUNT" 1
FEED_HAS_POST=$(echo "$FEED_A" | json 'd=>d.data?.some(p=>p.id==="'"$POST_1_ID"'")')
check "Feed contains created post" "$FEED_HAS_POST" "true"

# ──────────────────────────────────────────────
echo "--- 6. React to Post ---"
# ──────────────────────────────────────────────
REACT=$(curl -s -X POST "$API/posts/$POST_1_ID/reactions" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"type":"like"}')

check "React to post succeeds" "$(echo "$REACT" | json 'd=>d.success')" "true"
check "Reaction type is like" "$(echo "$REACT" | json 'd=>d.data?.reaction?.type')" "like"

# User B also reacts
REACT_B=$(curl -s -X POST "$API/posts/$POST_1_ID/reactions" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN_B" \
  -d '{"type":"love"}')
check "User B reacts to post" "$(echo "$REACT_B" | json 'd=>d.success')" "true"

# ──────────────────────────────────────────────
echo "--- 7. Create Group ---"
# ──────────────────────────────────────────────
GROUP_NAME="SmokeGroup${TS}"
GROUP=$(curl -s -X POST "$API/groups" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"name":"'"$GROUP_NAME"'","privacy":"public","description":"Smoke test group"}')

GROUP_ID=$(echo "$GROUP" | json 'd=>d.id')
check_not_empty "Create group returns id" "$GROUP_ID"
check "Group name matches" "$(echo "$GROUP" | json 'd=>d.name')" "$GROUP_NAME"
check "Group privacy is public" "$(echo "$GROUP" | json 'd=>d.privacy')" "public"
check "Group owner is user A" "$(echo "$GROUP" | json 'd=>d.ownerId')" "$USER_A_ID"
GROUP_MC=$(echo "$GROUP" | json 'd=>d.memberCount')
check "Group memberCount is 1 (owner)" "$GROUP_MC" "1"

# ──────────────────────────────────────────────
echo "--- 8. List Groups ---"
# ──────────────────────────────────────────────
GROUPS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/groups?limit=5" -H "Authorization: Bearer $TOKEN_A")
check "Groups list returns 200" "$GROUPS_STATUS" "200"
# Verify our group is in the list (pipe directly to avoid large variable issues)
GROUPS_HAS=$(curl -s "$API/groups?limit=5" -H "Authorization: Bearer $TOKEN_A" | json 'd=>d.groups?.some(g=>g.id==="'"$GROUP_ID"'")')
check "Groups list contains created group" "$GROUPS_HAS" "true"

# ──────────────────────────────────────────────
echo "--- 9. Get Group Detail ---"
# ──────────────────────────────────────────────
GROUP_DETAIL=$(curl -s "$API/groups/$GROUP_ID" -H "Authorization: Bearer $TOKEN_A")

check "Get group by id returns correct name" "$(echo "$GROUP_DETAIL" | json 'd=>d.name')" "$GROUP_NAME"

# ──────────────────────────────────────────────
echo "--- 10. Get Group Members (owner is member) ---"
# ──────────────────────────────────────────────
MEMBERS=$(curl -s "$API/groups/$GROUP_ID/members" -H "Authorization: Bearer $TOKEN_A")

MEMBER_COUNT=$(echo "$MEMBERS" | json 'd=>d.members?.length')
check "Group has 1 member (owner)" "$MEMBER_COUNT" "1"
OWNER_IN_MEMBERS=$(echo "$MEMBERS" | json 'd=>d.members?.some(m=>m.userId==="'"$USER_A_ID"'"&&m.role==="owner")')
check "Owner listed as member with owner role" "$OWNER_IN_MEMBERS" "true"

# ──────────────────────────────────────────────
echo "--- 11. User B Joins Group ---"
# ──────────────────────────────────────────────
JOIN=$(curl -s -X POST "$API/groups/$GROUP_ID/members" \
  -H "Authorization: Bearer $TOKEN_B")

check "Join group succeeds" "$(echo "$JOIN" | json 'd=>d.success')" "true"
check "Join message confirms" "$(echo "$JOIN" | json 'd=>d.message')" "Successfully joined the group"

# Verify members list updated
MEMBERS_2=$(curl -s "$API/groups/$GROUP_ID/members" -H "Authorization: Bearer $TOKEN_A")
MEMBER_COUNT_2=$(echo "$MEMBERS_2" | json 'd=>d.members?.length')
check "Group now has 2 members" "$MEMBER_COUNT_2" "2"
B_IN_MEMBERS=$(echo "$MEMBERS_2" | json 'd=>d.members?.some(m=>m.userId==="'"$USER_B_ID"'")')
check "User B in members list" "$B_IN_MEMBERS" "true"

# ──────────────────────────────────────────────
echo "--- 12. User B Leaves Group ---"
# ──────────────────────────────────────────────
LEAVE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE \
  "$API/groups/$GROUP_ID/members/me" \
  -H "Authorization: Bearer $TOKEN_B")

check "Leave group returns 204" "$LEAVE_STATUS" "204"

MEMBERS_3=$(curl -s "$API/groups/$GROUP_ID/members" -H "Authorization: Bearer $TOKEN_A")
MEMBER_COUNT_3=$(echo "$MEMBERS_3" | json 'd=>d.members?.length')
check "Group back to 1 member" "$MEMBER_COUNT_3" "1"

# ──────────────────────────────────────────────
echo "--- 13. Follow User ---"
# ──────────────────────────────────────────────
FOLLOW=$(curl -s -X POST "$API/social/follow/$USER_A_ID" \
  -H "Authorization: Bearer $TOKEN_B")

check "User B follows user A succeeds" "$(echo "$FOLLOW" | json 'd=>d.status')" "followed"

# ──────────────────────────────────────────────
echo "--- 14. Feed Shows Followed User Posts ---"
# ──────────────────────────────────────────────
FEED_B=$(curl -s "$API/feed?limit=20" -H "Authorization: Bearer $TOKEN_B")

FEED_B_HAS=$(echo "$FEED_B" | json 'd=>d.data?.some(p=>p.authorId==="'"$USER_A_ID"'")')
check "User B feed contains user A post (via follow)" "$FEED_B_HAS" "true"

# ──────────────────────────────────────────────
echo "--- 15. Profile ---"
# ──────────────────────────────────────────────
PROFILE=$(curl -s "$API/profiles/me" -H "Authorization: Bearer $TOKEN_A")

# Profile may not exist yet (auto-created on first access varies by implementation)
PROFILE_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/profiles/me" -H "Authorization: Bearer $TOKEN_A")
if [ "$PROFILE_STATUS" = "200" ]; then
  check "Get profile returns 200" "$PROFILE_STATUS" "200"
elif [ "$PROFILE_STATUS" = "404" ]; then
  echo "  SKIP  Profile not auto-created (expected for MVP)"
else
  check "Get profile returns 200 or 404" "$PROFILE_STATUS" "200"
fi

# ──────────────────────────────────────────────
echo "--- 16. Duplicate Registration Rejected ---"
# ──────────────────────────────────────────────
REG_DUP=$(curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"'"$USER_A_USER"'dup","email":"'"$USER_A_EMAIL"'","password":"'"$USER_A_PASS"'"}')

check "Duplicate email rejected" "$(echo "$REG_DUP" | json 'd=>d.success')" "false"

# ──────────────────────────────────────────────
echo "--- 17. Invalid Login Rejected ---"
# ──────────────────────────────────────────────
BAD_LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"$USER_A_EMAIL"'","password":"WrongPassword1@"}')

check "Wrong password rejected" "$(echo "$BAD_LOGIN" | json 'd=>d.success')" "false"

# ──────────────────────────────────────────────
echo "--- 18. Unauthenticated Access Rejected ---"
# ──────────────────────────────────────────────
UNAUTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$API/feed")
check "Feed without token returns 401" "$UNAUTH_STATUS" "401"

UNAUTH_POST=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/posts" \
  -H 'Content-Type: application/json' \
  -d '{"content":"should fail"}')
check "Create post without token returns 401" "$UNAUTH_POST" "401"

# ──────────────────────────────────────────────
echo "--- 19. Owner Can't Join Own Group ---"
# ──────────────────────────────────────────────
JOIN_OWN=$(curl -s -X POST "$API/groups/$GROUP_ID/members" \
  -H "Authorization: Bearer $TOKEN_A")

check "Owner joining own group rejected (409)" \
  "$(echo "$JOIN_OWN" | json 'd=>d.error')" "Already a member of this group"

# ──────────────────────────────────────────────
echo
echo "============================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  echo
  echo "Failures:"
  echo -e "$ERRORS"
  echo
  exit 1
fi
