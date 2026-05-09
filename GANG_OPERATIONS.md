# Gang Operations — How They Work

## Overview

Operations are a daily group activity for gangs. The leader picks an operation from the catalog, eligible members complete a daily task, and the gang vault earns income based on how many members participated.

Only one operation can be active per gang at a time.

---

## Starting an Operation

1. Open your gang's page (`/gangs/{id}`)
2. Scroll to the **Operations** section
3. Browse the catalog — each entry shows:
   - Name & description
   - Required skill and minimum level
   - Per-member daily income ($/d)
   - Daily task description
   - Upgrade costs for L2 and L3
4. Leader clicks **Start Operation** on their chosen operation
   - Leader must personally meet the skill requirement
   - Vault pays nothing to start — it's free

```
Example: Street Protection Racket
  Requires: Guerrilla Warfare Lv.15+
  Daily task: Win a mugging or ambush PvP attack
  Income: $200/eligible member/day (L1)
```

---

## Daily Cycle

### Eligibility
Each member must have the required skill at the minimum level. Members below the threshold:
- Show as ineligible in the member list
- Cannot complete the daily task
- Don't count toward daily progress or payout

### Completing the Daily Task
Eligible members click the **Complete Task** button. The system verifies the task was done today:

| Task Type | What It Checks |
|---|---|
| `pvp_win` | Any PvP win today in the PvP log |
| `crime` | Any crime committed today in the crime log |
| `train_skill` | The required skill was trained today |
| `deposit_vault` | Any vault deposit made today |

If verified, the member is marked **Done** for the day.

### Daily Progress Bar
Shows `completed / eligible` count. Full bar = maximum payout.

```
[████████░░] 4/5 members done → $800/day at $200/member
```

---

## Payout

- **Payouts happen once per 24 hours** after the previous payout
- Formula: `completedMembers × incomeRate`
- Paid directly into the **gang vault**
- If no payout is pending, nothing happens — the operation continues accumulating
- The **Pending Payout** badge appears when payout is ready to process

Note: Payouts are automatic when the 24h timer elapses. There's no manual "claim" step.

---

## Upgrading

Leader can upgrade an active operation from L1 → L2 → L3.

| Level | Cost (from vault) | Effect |
|---|---|---|
| L1 → L2 | Varies by operation ($35K–$60K) | Higher $/member |
| L2 → L3 | Varies by operation ($120K–$250K) | Higher $/member |

Higher levels also raise the skill requirement — members below the new threshold become ineligible.

---

## Stopping

Leader can stop an operation at any time:
- A final payout is calculated for the current 24h window
- The operation is removed from active
- Leader can start a different operation from the catalog

---

## UI Layout

The Operations section on the gang detail page has two parts:

### Top: Active Operation (if running)
Shows:
- Operation name & level badge
- Skill requirement reminder
- Daily task description
- Progress bar + member list with Done/Pending status
- **Complete Task** button (for eligible members who haven't done it yet)
- Pending payout indicator
- Leader controls: Stop, Level Up

### Bottom: Catalog
Scrollable list of all 10 operations. Each entry shows:
- Name, description, income rate
- Skill requirement + daily task type
- L2/L3 thresholds and upgrade costs
- Eligible member count for your gang
- **Start Operation** button (leader only, when no operation is active)

---

## Strategy Notes

- Pick operations matching your members' trained skills — wider eligibility = higher payout
- Upgrade costs come from the vault, so members should deposit before upgrading
- `pvp_win` tasks require winning attacks, while `crime` tasks are easier to complete
- Leaders should check the eligible member count before starting (visible on each catalog entry)
