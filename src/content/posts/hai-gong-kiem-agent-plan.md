---
author: Tran Cuong
pubDatetime: 2026-06-23T10:00:00.000+07:00
modDatetime:
title: "Two pincers: making an agent prove its plan both right and wrong"
featured: false
draft: false
tags: ["ai-agents", "critical-thinking"]
description: "Two opposing pincers that force an agent to break its own plan instead of rubber-stamping it from confirmation bias"
---

> Bài viết song ngữ. Bản tiếng Anh trước, bản tiếng Việt ở dưới.

A friend of mine noticed that Claude's planning workflow usually tries to prove itself right. It writes a draft plan, reviews that same plan, and decides it's fine. Every agent I run does this.

The problem is that checking your own work is hard. When I review my own plan I'm not neutral. I already want it to be right, so I go looking for reasons it works instead of reasons it breaks. That's confirmation bias, and you can measure it in an LLM too.

So instead of one self-review step, I set up two opposing pincers around the draft.

```mermaid
flowchart LR
  D["Draft plan"] --> P1["Pincer 1 — prove it RIGHT<br/>steelman"]
  D --> P2["Pincer 2 — prove it WRONG<br/>red team / falsification"]
  P1 -->|"strongest defense"| C{"Convergence point — crux"}
  P2 -->|"strongest attack"| C
  C --> R["A better, revised plan"]
```

### Why self-review goes blind

Wason's 2-4-6 task is the classic example. People test a guess by looking for cases that confirm it, not cases that break it. But the only way to find the actual rule is to try something that could prove you wrong.

An agent reviewing its own plan does the same thing. Ask it to prove the plan is right and it goes off to collect supporting evidence, then reads anything ambiguous in its own favor. It turns into a loop:

```mermaid
flowchart TD
  H["Hypothesis: this plan is right"] --> S["Search for SUPPORTING evidence"]
  S --> I["Read ambiguous bits in its favor"]
  I --> M["Remember the times it was right"]
  M --> H
```

### The two pincers

Pincer one proves the plan right. This is a steelman: build the strongest version of the plan you can, the best case for it. Not cheerleading, actual hard arguments in its favor.

Pincer two proves the plan wrong. This is the red team, or Popper's falsification if you want the fancy word: try hard to break it. A plan that survives a real beating is worth a lot more than one that just got approved.

One catch, and it's the important one. Pincer two only works if it's actually independent. An agent that just flips into "critic mode" is still carrying the same blind spots it had a second ago. So I run pincer two as a separate subagent with its own context, blind to whatever pincer one argued. It's the same reason I [run agents in parallel as separate processes](/posts/parallel-coding-agents-without-babysitting/) instead of one thread doing everything.

### Read only the convergence point

Here's the useful part. I don't read the whole plan. I read the one spot where pincer one says "fine" and pincer two says "broken" about the same assumption.

```
wrong  ───────►  convergence  ◄───────  right
```

That assumption is the crux: change it and the conclusion changes with it. All the signal is there. The arguing around the edges I skip.

I'm not trying to get a yes or no out of this either. The two sides collide on the crux, it surfaces an assumption I didn't know I was making, and I fix the plan. The goal isn't to pick a winner, it's to end up with a better plan. Better plan, and I only had to read the middle.

---

## Tiếng Việt

Một thằng bạn tôi để ý cái workflow planning của Claude hay đi chứng minh chính nó đúng. Viết xong bản nháp kế hoạch, nó tự review lại bản đó, rồi kết luận là ổn. Agent nào tôi chạy cũng dính.

Vấn đề là tự kiểm tra việc của mình thì dở. Lúc review plan của mình tôi đâu có trung lập. Tôi muốn nó đúng sẵn rồi, nên tôi đi tìm lý do nó chạy được chứ không tìm lý do nó gãy. Đó là thiên kiến xác nhận, và LLM cũng đo được cái này.

Nên thay vì một bước tự review, tôi dựng hai gọng kiềm ngược nhau quanh bản nháp.

```mermaid
flowchart LR
  VD["Bản nháp kế hoạch"] --> VP1["Gọng 1 — chứng minh ĐÚNG<br/>steelman"]
  VD --> VP2["Gọng 2 — chứng minh SAI<br/>red team / falsification"]
  VP1 -->|"phòng thủ mạnh nhất"| VC{"Điểm hội tụ — crux"}
  VP2 -->|"đòn phá mạnh nhất"| VC
  VC --> VR["Kế hoạch sửa tốt hơn"]
```

### Vì sao tự review lại mù

Bài 2-4-6 của Wason là ví dụ kinh điển. Người ta kiểm tra một phán đoán bằng cách đi tìm trường hợp xác nhận nó, chứ không tìm trường hợp làm nó sai. Mà muốn tìm ra luật thật thì phải thử đúng cái có thể làm mình sai.

Agent tự review plan của nó y chang. Bảo nó chứng minh plan đúng thì nó đi gom bằng chứng ủng hộ, chỗ nào mơ hồ thì đọc theo hướng có lợi cho nó. Thành một vòng lặp:

```mermaid
flowchart TD
  VH["Giả thuyết: kế hoạch này đúng"] --> VS["Tìm bằng chứng ỦNG HỘ"]
  VS --> VI["Diễn giải chỗ mơ hồ theo hướng có lợi"]
  VI --> VM["Nhớ mấy lần mình đúng"]
  VM --> VH
```

### Hai gọng

Gọng một: chứng minh plan đúng. Đây là steelman, dựng bản mạnh nhất của plan, lý lẽ cứng nhất bênh nó. Không phải khen suông, mà cãi thật cho nó.

Gọng hai: chứng minh plan sai. Đây là red team, hay nói chữ thì là khả phủ chứng kiểu Popper: cố hết sức đập cho nó gãy. Plan nào sống sót qua một trận đập thật thì đáng tin hơn nhiều cái plan chỉ được duyệt cho qua.

Có một chỗ phải để ý, và nó quan trọng. Gọng hai chỉ ăn thua nếu nó độc lập thật. Agent mà chỉ đổi sang "chế độ phản biện" thì vẫn xài chung mấy điểm mù của chính nó lúc nãy. Nên tôi cho gọng hai chạy bằng một subagent riêng, context riêng, không thấy gọng một cãi gì. Cũng là lý do tôi [chạy agent song song thành nhiều process tách biệt](/posts/parallel-coding-agents-without-babysitting/) chứ không nhét hết vào một luồng.

### Chỉ đọc điểm hội tụ

Tới chỗ hay. Tôi không đọc cả plan. Tôi đọc đúng chỗ gọng một nói "ổn" còn gọng hai nói "gãy" trên cùng một giả định.

```
sai  ───────►  điểm hội tụ  ◄───────  đúng
```

Cái giả định đó là crux: đổi nó thì kết luận đổi theo. Tín hiệu nằm hết ở đó. Mấy chỗ cãi qua cãi lại bên lề thì bỏ.

Tôi cũng không cố lấy ra một câu trả lời đúng hay sai. Hai bên va vào crux, nó lòi ra cái giả định mà tôi không biết là mình đang giả định, rồi tôi sửa plan. Mục tiêu không phải chọn bên thắng, mà là plan ra tốt hơn. Plan tốt hơn, mà tôi chỉ phải đọc khúc giữa.
