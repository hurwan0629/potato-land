---
title: "사용자 프로필 상세"
date: 2026-08-05
repository: "hurwan0629/potato-land"
branch: "integration/hurwan/team-merge"
commit: "061e78c2bcd039191277b211a51fd08bb1669feb"
tags:
  - potato-land
  - implementation-audit
---

# 사용자 프로필 상세

## 구현 현황

- 실행 가능: 내 정보, 비밀번호 확인, 통합 수정, 탈퇴
- 501: 외부 프로필, 프로필 이미지 수정

## 핵심 계약 불일치

| 문서 | 구현 |
|---|---|
| `verificationToken` | `editToken` |
| `newPassword` | `password` |
| 탈퇴 요청에 현재 비밀번호 | editToken 중심 |
| 탈퇴 시 판매글·경매·입찰·거래·알림·timer 연쇄 정리 | 사용자 soft delete + session 삭제 |
| 내 정보 DTO에 bio/거래수/평점/후기수 | 일부 기본 profile만 반환 |

따라서 실행 가능한 4개도 “완전 구현”으로 볼 수 없다.
