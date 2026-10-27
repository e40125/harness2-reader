# Harness²：逐頁口說逐字稿（加快版）

## Slide 01 — Harness²

今天要介紹的是 Harness²：Recursive Agent Harnessing for an Open World。

這篇是 Northwestern University 和 Google Cloud AI Research 的合作，第一作者是 Ruiyao Xu。

它要處理的問題是，現實中的 task 一直在變，很難事先替每種情況設計好 harness。而且很多 task 沒有標準答案，也不容易判斷怎麼改才會更好。

Harness² 會從實際執行紀錄找出問題，修改 harness，再觀察修改後的差異。這些修改經驗也會留下來，幫助之後的新 task。

那我們先看，harness 具體包含哪些東西。

來源：§1, pp. 1–2 · ACL 2026 · AISTATS 2025 · CVPR 2017。

---

## Slide 02 — What can a harness change?

我們使用 agent 時，除了選 model，還要設定 instruction、工具、skill，以及結果怎麼檢查。Paper 把這些設定和執行機制叫做 harness。

這張圖有八種 component。
System prompt 決定基本角色和做事方式，guardrails 放規則，memory 保存執行時要用的資訊。這三種內容會在每次 model call 時提供；skill 則放特定工作的步驟，需要時才載入。

Tool guidance 說明工具怎麼用，script 是可以直接執行的程式。Subagent 可以接手部分工作，在自己的 context 裡處理。

Plugin 則在工具呼叫前後等時間點執行程式，不需要等 model 決定要不要做。

這些 component 都存成檔案，修改 harness 就是編輯這些檔案。接下來分清楚，誰執行 task，誰負責修改。

來源：§§1–2.1 · Figure 2, p. 3 · Table 5, p. 22。

---

## Slide 03 — Two levels of recursion

Executor 負責完成 task，使用的是 execution harness。Editor 則看執行紀錄，提出修改，讓 executor 重做同一題，再根據結果繼續調整。這是第一層，task-level recursion。

Editor 自己也需要指引。Paper 把支持修改過程的設定和經驗叫做 improvement harness，其中累積經驗的地方就是 library。
它是給 editor 修改時參考的，和 executor 執行時讀的 memory，用途不同。

同一題裡，improvement harness 保持固定。等 task 完成，才整理修改經驗、更新 library。這是第二層，harnessing-level recursion。

下一題仍從共同的初始 execution harness 開始，再參考 library 調整。最開始 library 是空的，第一題先從自己的執行紀錄找問題。

那沒有標準答案時，要怎麼判斷修改有沒有幫助？

來源：§§2.1–2.3 · pp. 4–7。

---

## Slide 04 — Propose, probe, compose

這個過程分成 Propose、Probe 和 Compose。

先用原本的 harness 執行 task，留下 trajectory，也就是操作和工具呼叫的紀錄，以及 deliverable，也就是最後交出的程式、文件或其他成果。

Propose 是提出修改。Invariant editor 看規劃、工具使用等流程問題，domain editor 看這類工作的知識和程序要求。兩邊各提出一個改好的 harness，形成兩個 candidate。

Probe 讓兩個 candidate 在相同 model 和環境設定下，重做同一個 task。比如原本交出檔案後沒有檢查，修改後有沒有真的重新打開檔案？
這種 behavioral contrast 提供修改前後的行為證據，但不能保證成果完全正確。

Compose 再根據修改內容和執行結果，整合有幫助的部分，也可以採用其中一個版本，或保留原本的 harness。組成的新版本還會再執行一次。

這整套算一次 improvement step，也就是 k 等於 1。接下來看實際案例。

來源：Figure 3 · §2.2.1 · pp. 4–5。

---

## Slide 05 — A tool call must actually execute

這個案例來自 WorkBuddy-Bench，是評估 agent 完成實際工作的 benchmark。它的 Code、Web、Office，分別涵蓋程式、網頁，以及文件和資料等辦公工作。

這一題要修改處理路徑配對的 router 程式。但 agent 把 tool call 寫成普通文字，實際上沒有工具執行，這個 turn 就結束了。

Editor 因此修改 C4，也就是 tool guidance，要求使用正式的 tool-call interface。重新執行後，工具真的動了，相關測試也通過，個案分數從 60 到 100。

這個分數是研究者事後評估的。Editor 修改時看的，是工具有沒有執行的紀錄，沒有看到評分。

如果要進一步改善，應該多試幾種方案，還是沿著目前的方案繼續改？

來源：Figure 15, p. 27 · Appendix B, pp. 18–19。

---

## Slide 06 — Parallel width or sequential depth

Paper 測試兩種方式。Parallel 從同一起點多試幾種修改；sequential 則改完一輪，再接著改下一輪。k 用來設定探索量。

兩種方式都先用原本的 harness 執行 k 次，取得參考紀錄。

Parallel 讓兩種 editor 各提出 k 個 candidate，每個都執行。接著由 k 個 composer 參考全部結果，各自整合並執行新的 harness。
k 等於 5，就是十個 candidate、五個整合後的版本。

Sequential 則把每輪改好的 harness 當作下一輪的起點，也保留前面的執行證據。k 等於 5，就是連續做五輪。

k 大於 1 時，最後由 selector 對照 task 要求和原始資料，從匿名的成果裡選一份。Composer 改的是 harness，selector 選的是已經完成的成果。k 等於 1 時，跳過 selection。

k 事先設定，每次執行也有 turn 和時間上限。Task 完成後，再整理修改經驗。

來源：Figure 4 · §2.2.2, pp. 5–6 · Appendix D.1, p. 21。

---

## Slide 07 — What the library remembers

Task 做完，reflector 會回頭看完整修改紀錄，判斷哪些修改有幫助、哪些造成問題。如果幾個地方一起改，無法分清效果，這個不確定也要留下來。

Library 保存採用的 harness，以及 EXPERIENCE.md。前者包含可以重用的 component；後者記錄適用情況、修改方式、支持證據和判斷的把握。

像剛才的 router 案例，可以留下要求使用正式 tool-call interface 的 tool guidance，以及工具確實執行、測試通過的證據，供類似情況參考。

新 task 的資料和路徑仍然要重新確認。證據不足時，也可以不新增經驗。

接下來看實驗，確認這些修改有沒有讓最後交出的成果變好。

來源：Equation 4 · §2.3, p. 7 · Prompt 6, pp. 36–37。

---

## Slide 08 — One step improves the base harness

實驗用了 Gemini 3.5 Flash 和 GLM-5，各搭配 OpenCode、Codex，總共四種配置。預設 editor 是 Claude Opus 4.8。

三個 benchmark 裡，WorkBuddy 評估程式、網頁和辦公工作，分數是檢查通過的比例。JobBench 評估完整的職業工作，由 model 擔任 judge，按加權項目評分。LAB 是法律工作的 benchmark，Partial 表示評分項目通過的比例。

表格裡的 ReasoningBank 把舊經驗放進 prompt，給 executor 參考。Meta-Harness 先在另外的 training tasks 上修改 harness，再固定用於測試。Harness Scaling 會改目前這題的 harness，但不保留跨 task 經驗。

Harness² 則在當前 task 修改 harness，並讓 editor 參考先前的修改經驗。

每個設定換三次 task 順序重跑，因為 library 會逐題累積。表格呈現平均，括號是 standard deviation，也就是結果的分散程度。

先看畫面上的 Gemini 加 OpenCode。一次 improvement step，讓 WorkBuddy 從 72.4 到 77.5，增加 5.1 points；JobBench 從 31.5 到 36.0；LAB 從 79.9% 到 81.9%。三個 benchmark、四種配置，都高於各自的 base。

最下面的 + Recursion，是 parallel 的 k 增加到 5 後，額外帶來的改善。下一頁看探索量增加時的變化。

來源：Tables 1–2, pp. 8–9 · Appendices B–C, pp. 18–20。

---

## Slide 09 — More exploration improves performance

這張圖沿用 Gemini 加 OpenCode。左邊 Code 是程式工作，右邊 Office 是文件和資料等辦公工作，縱軸都是平均檢查通過率。

藍色 parallel 從同一起點多試方案，紫色 sequential 則接著上一輪繼續改。橫軸 k 從一增加到五，表示增加方案數或修改輪數。

兩種方式的分數都隨 k 上升。以 parallel 為例，Code 從 76.5 到 80.8，Office 從 79.5 到 83.4。但兩種方式的高低，也會隨 budget 改變。

灰色的 Best-of-k base，讓原本的 harness 多跑幾次，再挑一份成果。這裡 Harness² 的兩種方式在 k 等於 2，就超過圖中其他 baseline 在 k 等於 5 的分數。

不同方法的 k 並不代表相同成本。Figure 6 另外把執行、probe 和修改花掉的 tokens 都算進去比較。

接下來看，哪些機制帶來這個改善。

來源：Figure 5 · §4 · pp. 9–10。

---

## Slide 10 — Each component contributes

這裡做的是 ablation，保留其他設定，每次拿掉一個機制，和完整方法比較。k 固定在 1。

拿掉 library，每題仍能修改 harness，但沒有前面 task 的經驗。WorkBuddy 從 77.5 降到 74.4，JobBench 從 36.0 降到 34.2。

拿掉 scoping，就是把 invariant 和 domain editor 換成兩個沒有指定診斷角度的 generic editor。Candidate 數量和 probe budget 相同，JobBench 仍從 36.0 降到 32.3。

拿掉 composition，兩個 candidate 都會執行，但最後只選其中一個，省略整合修改。WorkBuddy 降到 75.9，JobBench 降到 34.1。

三項機制拿掉後，兩個 benchmark 的平均分數都下降，支持經驗、分工和整合各自的作用。

那沒有新的 probe，或換到另一個 benchmark，library 還有幫助嗎？

來源：Table 3 · §4 · p. 10。

---

## Slide 11 — Experience supports later harnessing

左邊先省略 reference execution 和 candidate probes，讓 editor 直接改 harness，再由修改後的版本完成 task。這是在看，沒有新的執行證據時，舊經驗能不能幫忙。

沒有 library，Code 從原本的 73.4 降到 63.2。提供先前用 k 等於 5 累積的 library 後，三類工作都高於 base，例如 Office 從 74.0 到 79.1。
這裡的 k 等於 5，是建立 library 時的探索量。

右邊則把 JobBench 累積的 library，交給 WorkBuddy 的 editor，照常做一次 improvement step。
和原本的一次 improvement step 比較，Office 從 79.5 到 82.4，多了 2.9 points；Code 和 Web 也都有提升。

這表示修改經驗可以幫助另一套 benchmark 的 task，editor 再根據新要求調整要採用的 component。

來源：Figure 7 · §4 · pp. 10–11。

---

## Slide 12 — What does Harness² establish?

最後回到三個動作。

Adapt，是根據目前 task 的執行證據，提出、測試並整合 harness 修改。

Remember，是把可以重用的 component 和有證據支持的修改經驗留下來。

Reuse，是在新 task 裡，讓 editor 選擇相關經驗，再調整成這一題需要的版本。

實驗裡，一次 improvement step 就改善了三個 benchmark、四種配置的 base 表現。Ablation 支持 library、editor 分工和 composition 的作用，library 的實驗也顯示，先前經驗能幫助之後的修改。

來源：§6, p. 13 · Tables 1–3 · Figure 7。

---

