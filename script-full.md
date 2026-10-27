# Harness²：逐頁口說逐字稿（完整版）

## Slide 01 — Harness²

今天要介紹的是 Harness²：Recursive Agent Harnessing for an Open World。

這篇是 Northwestern University 和 Google Cloud AI Research 的合作。第一作者 Ruiyao Xu 是 Northwestern 的博士生，之前以第一作者發表過 ACL 2026 的 CoAct。
共同作者 Chen-Yu Lee 參與的研究，獲得過 AISTATS 的 Test of Time Award；Tomas Pfister 則是 CVPR Best Paper 獲獎論文的共同作者。

這篇要解決的問題是，現實中的 task 一直在變，我們很難事先替每種情況設計好 harness。而且很多 task 沒有標準答案，也不容易判斷怎麼改才會更好。

Harness² 的想法是，讓 agent 根據自己實際執行 task 的過程，找出可以改善的地方，再回頭修改 harness，觀察修改後的差異。
而且，這些修改的經驗也會保留下來，幫助之後遇到新 task 時，知道該怎麼調整。

那接下來，我們先看這個 harness 具體包含哪些東西。

來源：§1, pp. 1–2 · ACL 2026 · AISTATS 2025 · CVPR 2017。

---

## Slide 02 — What can a harness change?

我們平常在用 agent 的時候，除了選 model，還要決定給它什麼 instruction、能用哪些工具、什麼時候載入 skill，以及怎麼檢查最後的結果。
這些 model 外面的設定和執行機制，paper 統稱為 harness。

那具體可以改哪些東西？
這張圖把 harness 拆成八種 component，再按照它們在 agent 執行時的作用，分成四個區塊。

先看左邊的 context construction，也就是決定 model 會讀到哪些資訊，以及什麼時候讀到。System prompt 決定基本的角色和做事方式，guardrails 放需要遵守的規則，memory 則保存執行時會用到的長期資訊。這三種內容會在每次 model call 時提供。
Skill 的用法不太一樣。它可以放某一類工作的完整操作步驟，等到 agent 需要做這類工作時，再載入這些內容，就不用一開始把所有操作說明都放進 context。

再看右邊的 tool interface，也就是 agent 使用工具的部分。Tool guidance 告訴 agent 什麼時候、怎麼使用現有工具。Script 則是可以直接執行的程式，比如讀資料、轉檔，或檢查輸出。

下面的 orchestration 處理的是工作怎麼分配。這裡的 subagent 可以接手一部分工作，在自己的 context 裡處理，再把結果傳回主要的 agent。
最後看 middleware，也就是 plugin 所在的區塊。Plugin 會在工具呼叫前後等時間點執行預先寫好的程式，例如檢查工具結果。到了設定的時間點，這些檢查就會執行，不需要等 model 自己決定要不要做。

這些 component 實際上都存成檔案。修改 harness 時，就會去編輯對應的 instruction、操作步驟或程式，再用修改後的設定執行 task。
有了可以修改的地方，接下來要分清楚的是，誰在執行 task，誰在看執行結果並修改這些檔案。

來源：§§1–2.1 · Figure 2, p. 3 · Table 5, p. 22。

---

## Slide 03 — Two levels of recursion

在這個流程裡，我們先分清楚 executor 和 editor 這兩個角色。
Executor 負責實際完成 task。它做事時使用的 execution harness，就是剛才介紹的八種 component。Editor 則負責讀取執行紀錄，找出工作方式可以改善的地方。

先看現在這一題。Editor 會提出修改，讓 executor 用修改後的 harness 重做同一個 task，再根據結果決定怎麼繼續改。這是第一層，paper 叫做 task-level recursion。

但 editor 自己也需要指引，知道應該看哪些問題、以前試過哪些做法。Paper 把支持這個修改過程的設定和經驗叫做 improvement harness，其中會累積經驗的地方就是 library。
這個 library 是給 editor 修改 harness 時參考的，和上一張圖裡 executor 執行時讀的 memory，用途不同。

在同一題裡，這份 improvement harness 先固定。等 task 做完，才回頭整理這次哪些修改有用、在什麼情況下有用，再更新 library。這是第二層，harnessing-level recursion。

下一題進來，execution harness 會從共同的初始版本重新開始。Editor 再去 library 找適合的 component 和經驗，調整成這一題需要的版本。
最開始 library 是空的，第一題就先從自己的執行紀錄找問題。
那我們先看當前這一題：沒有標準答案可以直接拿來評分時，editor 要怎麼判斷一個修改值不值得保留？

來源：§§2.1–2.3 · pp. 4–7。

---

## Slide 04 — Propose, probe, compose

Paper 的做法是，先觀察原本的 agent 怎麼做，再實際執行修改後的版本，對照行為有沒有改變。這個過程分成 Propose、Probe 和 Compose。

我們從圖的左邊開始看。先用原本的 harness 做一次 task，把執行過程和最後產出的東西留下來。執行過程叫做 trajectory，裡面會記錄 agent 做了哪些操作、呼叫了哪些工具。最後交出的程式、文件或其他成果，則叫做 deliverable。這兩個就是後面比較的參考。

接著是 Propose，也就是提出修改。一個 task 沒做好，可能是工作流程有問題，也可能是這個領域需要的做法沒有掌握好，所以 paper 分成兩個角度來看。
Invariant editor 看的是規劃、工具使用，或 agent 有沒有太早結束工作。Domain editor 則看這類工作本身的要求，例如試算表的計算方式，或法律文件需要具備的結構。兩邊各自提出一個改好的 harness，這就是兩個 candidate。

到了 Probe，就讓這兩個 candidate 真的去做同一個 task。Executor 和環境設定保持一致，再比較修改前後的執行過程和產出。
比如原本沒有重新打開輸出檔案，修改後有沒有真的去打開、檢查。這種前後對照就是 behavioral contrast，它讓 editor 有具體的行為證據可以判斷。不過，一次執行看起來比較好，還不能保證最後成果完全正確。

最後是 Compose。負責這一步的 composer，會一起看原本的執行、兩個 candidate 改了什麼，以及 probe 的結果，再決定哪些修改值得整合、哪些需要調整。它也可以採用其中一個版本，或保留原本的 harness。
組成新的 harness 之後，還會再執行一次 task，取得這個版本的成果。

這整套流程算一次 improvement step。後面講 k 等於 1，指的就是做一次這樣的流程。
接下來看一個實際案例，看看執行紀錄裡的問題，怎麼變成具體的修改。

來源：Figure 3 · §2.2.1 · pp. 4–5。

---

## Slide 05 — A tool call must actually execute

這個案例來自 WorkBuddy-Bench，它是一套用來評估 agent 能不能完成實際工作的 benchmark。
裡面分成三類工作。Code 是程式相關的 task，Web 包含網頁互動等工作，Office 則是文件、資料和工作空間的操作。這一題屬於 Code，要修改處理路徑配對的 router 程式，讓相關測試通過。

但原本的 agent 還沒真正開始修改，就遇到了問題。它把 tool call 寫成一般文字，看起來像是在呼叫工具，實際上卻沒有任何工具執行，這個 turn 就結束了。

Editor 因此從 C4，也就是 tool guidance 下手。新的 instruction 要求 agent 使用正式的 tool-call interface，並明確禁止把工具呼叫寫成普通文字。
用修改後的 harness 再跑一次，執行紀錄裡就真的出現工具操作，相關測試也通過了。這個案例最後的 benchmark score，從 60 提高到 100。

這裡的分數是研究者事後評估得到的。Editor 在修改當下，看到的是工具沒有執行，以及改完後工具有沒有真的動起來，沒有拿這個分數來決定怎麼改。

這個例子用一次修改就處理了工具呼叫的問題。但同一個 task 可能有其他問題，也可能有不同的修改方式。
所以，如果有更多探索的 budget，應該拿來多試幾種方案，還是沿著目前的方案繼續改？

來源：Figure 15, p. 27 · Appendix B, pp. 18–19。

---

## Slide 06 — Parallel width or sequential depth

Paper 測試了兩種做法。左邊叫做 parallel，是從同一個起點多試幾種修改方案。右邊叫做 sequential，則是先改一輪，再根據這一輪的結果繼續改。
這裡用 k 來設定探索量。對 parallel 來說，k 增加的是同一輪要嘗試的方案數量。對 sequential 來說，k 增加的是前後要做幾輪修改。

兩種做法一開始，都會先用原本的 harness 執行 k 次，了解它在這一題的表現，作為後面比較的參考。

先看 parallel。Invariant editor 和 domain editor 會各提出 k 個 candidate，所以總共有 2k 個候選版本，每個都實際執行一次。接著開 k 個 composition session，每個 composer 都能看到全部 candidate 的修改和執行結果，再各自組出一個新的 harness，拿去執行。
例如 k 等於 5，就是兩種角度各提出五個 candidate，合計十個，再由五個 composer 根據這些結果，產生五個整合後的版本。

Sequential 則是一輪接著一輪。第一輪修改並執行之後，第二輪就用改好的 harness 作為起點，參考前面留下的紀錄，繼續提出修改、測試和整合。
k 等於 5，就是連續做五輪，後面可以保留前面有效的做法，也可以修正前一輪造成的問題。

當 k 大於 1，最後會有幾份已經做好的成果，這時由 selector 對照 task 要求和原始資料，從匿名的 deliverables 裡選出一份。
前面的 composer 負責修改 harness，這裡的 selector 則負責選最後交出去的成果。它直接選現有的一份，不會再把幾份答案合寫成新的內容。k 等於 1 時，就直接交出基本流程的結果，跳過這個 selection。

k 是事先設定的，每次執行也有 turn 和時間上限。當這一題的成果交出去之後，接下來才整理這次修改留下的經驗。

來源：Figure 4 · §2.2.2, pp. 5–6 · Appendix D.1, p. 21。

---

## Slide 07 — What the library remembers

Task 做完之後，負責整理經驗的角色叫做 reflector。
它會回頭看完整的修改紀錄，包括原本怎麼執行、每個 candidate 改了什麼，以及 probe 和 composition 的結果。

接著，它會判斷哪些修改有幫助、哪些造成問題，還有哪些看不出效果。如果幾個地方一起改，分不清楚是哪一個造成差異，這個不確定也要留下來。
所以，最後選中了某個版本，還是要回頭看裡面每項修改的證據，才能知道哪些做法值得留給之後參考。

Library 裡會保存採用的 harness，以及一份 EXPERIENCE.md。
Harness 裡有之後可以拿來使用或調整的 component，例如 skill 和 script。EXPERIENCE.md 則說明，這個做法適合什麼情況、具體要怎麼改、執行紀錄提供了哪些支持，以及這個判斷有多少把握。

回到剛才的 router 案例，可以留下來供之後參考的，就是要求使用正式 tool-call interface 的那段 tool guidance，以及這次修改後，工具確實執行、測試通過的證據。之後再遇到 tool call 被寫成文字的情況，editor 就有具體的修改方式可以參考。

使用這些經驗時，舊 task 裡的檔案位置、數值或資料對應，仍然要根據這一題的資料重新確認。
如果紀錄還不足以支持一個可重用的經驗，也可以不新增 experience entry。

到這裡，我們已經知道目前這一題怎麼改，以及修改經驗怎麼留給之後使用。接下來看實驗，確認這套做法最後有沒有讓 agent 交出的成果變好。

來源：Equation 4 · §2.3, p. 7 · Prompt 6, pp. 36–37。

---

## Slide 08 — One step improves the base harness

實驗首先比較的是，直接用原本的 harness 做 task，和經過 Harness² 修改之後，成果有沒有差別。
Paper 用 Gemini 3.5 Flash 和 GLM-5 當 executor，各自搭配 OpenCode 和 Codex 這兩套初始 harness，所以總共有四種配置。預設負責修改的 editor 是 Claude Opus 4.8。

評估用了三個 benchmark。剛才介紹的 WorkBuddy，會用程式測試、檔案和結構檢查來評估成果。有些項目則交給 model 擔任 judge，也就是由 model 根據評分要求來檢查。最後的分數，是這個 task 通過多少比例的檢查。
JobBench 比較接近完整的職業工作。它會提供輸入文件和要交出的成果要求，再由 judge 按照不同權重的評分項目打分數。
LAB 是 Harvey 的 Legal Agent Benchmark，內容包括法律分析、草擬、審閱和研究。表格裡的 Partial，表示 judge 逐項檢查後，通過項目的比例。

除了原本的 base harness，表格裡還有三個比較方法。
ReasoningBank 會把過去做 task 的經驗整理成策略。下一題進來時，再找相似的經驗放進 prompt，讓 executor 在做事時參考。
Meta-Harness 則先在另外的 training tasks 上測試、修改 harness，用評分挑出較好的版本，再用這個版本去做 test tasks。搜尋時也會把修改經驗留下來，供下一輪搜尋參考。
Harness Scaling 是在目前這一題裡，根據執行紀錄反覆修改 harness。換到下一題就重新開始，不會保留跨 task 的修改經驗。

這幾種方法的差別，在於經驗是給誰用、什麼時候修改。Harness² 是在收到目前這一題之後才修改 harness，前面累積的經驗則用來幫助 editor 判斷怎麼改。

每個設定都換三次 task order 重跑，因為 library 逐題累積，題目順序會影響當下有哪些經驗能用。表格呈現三次的平均，括號裡是 standard deviation，也就是這三次結果的分散程度。

現在先看 Gemini 3.5 Flash 加 OpenCode。WorkBuddy 三類工作的平均分數，原本是 72.4，做一次 improvement step 之後變成 77.5，增加 5.1 points。
同一個配置在 JobBench，分數是從 31.5 到 36.0。LAB 的評分項目通過率，則從 79.9% 到 81.9%。完整結果裡，三個 benchmark、四種配置的一次 improvement step，都高於各自的 base 表現。

最下面的加號那一列，是把 parallel 的探索量增加到 k 等於 5，還能再增加多少。像這裡的 WorkBuddy 平均再加 3.3，就從 77.5 到 80.8。
那多出來的探索，怎麼影響表現？下一頁把程式工作和辦公工作分開，看看 k 逐步增加時的變化。

來源：Tables 1–2, pp. 8–9 · Appendices B–C, pp. 18–20。

---

## Slide 09 — More exploration improves performance

這張圖延續剛才 Gemini 3.5 Flash 加 OpenCode 的配置，測的是 WorkBuddy 裡面兩類工作。
左邊的 Code，是修改程式等程式相關的 task。右邊的 Office，則是處理文件、資料和工作空間等辦公工作。兩張圖的縱軸，都是這一類工作的平均檢查通過率。

圖上比較的是前面介紹的兩種探索方式。藍色的 parallel，會從同一個起點多提出幾種修改，再比較、整合。紫色的 sequential，則是根據上一輪改完的結果，繼續做下一輪修改。
橫軸的 k 從一增加到五，表示讓 parallel 嘗試更多方案，或讓 sequential 多改幾輪。我們要看的是，增加探索量之後，最後的成果有沒有變好。

在這兩類工作裡，兩種做法的分數都隨著 k 增加而上升。以 parallel 為例，程式工作的分數從 76.5 到 80.8，辦公工作則從 79.5 到 83.4。
但哪種探索方式比較好，也會隨著 budget 改變。像左邊的程式工作，在 k 等於 2 時，sequential 比較高。到了 k 等於 5，則是 parallel 比較高。

這裡還有一個比較方法，叫做 Best-of-k base，也就是灰色的柱子。它讓原本的 harness 多跑幾次，再從產出的成果裡選一份，用來觀察只增加執行次數能帶來多少改善。
在這兩張圖裡，Harness² 的兩種做法到了 k 等於 2，就已經超過其他畫出的 baseline 在 k 等於 5 的分數。

不過，不同方法的 k 對應到的工作量並不一樣。要比較成本，原本的參考執行、candidate 的測試，以及修改過程用掉的 tokens，都要一起算進去。Paper 另外在 Figure 6 做了這個比較。

接下來，我們進一步看這個提升來自哪些機制。Paper 把 library、兩種 editor 的分工和 composition 分別拿掉，看看少了其中一個，結果會怎麼變。

來源：Figure 5 · §4 · pp. 9–10。

---

## Slide 10 — Each component contributes

這個實驗叫做 ablation，也就是保留其他設定，每次只拿掉一個機制，和完整的方法比較。
這裡把 k 固定在 1，都是做一次 improvement step。表格左邊是 WorkBuddy 三類工作的平均分數，右邊是 JobBench 的職業工作分數。

先看 library。拿掉它之後，每一題仍然會根據自己的執行紀錄改 harness，但前面 task 的修改經驗不會傳給後面。
WorkBuddy 的分數從 77.5 降到 74.4，JobBench 則從 36.0 降到 34.2。

再看 scoping，也就是前面 invariant 和 domain 這兩種診斷角度的分工。實驗仍然保留兩個 editor，也保留相同數量的 candidate 和 probe，只是兩邊都改成 generic editor，沒有指定各自要看哪一類問題。
這時 JobBench 從 36.0 降到 32.3。因為 editor 和測試的數量都保留了，這個比較可以幫助我們看出，分開診斷角度本身的作用。

最後是 composition。這次兩個 candidate 都還是會執行，但執行完就根據結果選其中一個，少了把有用的修改重新整合、調整的步驟。
WorkBuddy 的分數降到 75.9，JobBench 則降到 34.1。

三項機制拿掉之後，兩個 benchmark 的平均分數都下降。Library 提供過去的修改經驗，scoping 讓 editor 從不同角度找問題，composition 則把有證據支持的修改整合起來。
接下來就進一步看，沒有新的 probe 時，這些經驗能不能協助修改，以及換到另一個 benchmark 之後，還能不能用。

來源：Table 3 · §4 · p. 10。

---

## Slide 11 — Experience supports later harnessing

這張圖分別回答剛才的兩個問題，我們先看左邊。
前面的流程會先跑原本的 harness，再測試 candidate，讓 editor 有執行結果可以比較。這個實驗把這些 reference execution 和 candidate probes 省略，讓 editor 直接改 harness，再由改好的版本去執行 task。
最後仍然會執行 task，只是 editor 修改時拿不到新的執行證據。這樣就能觀察，之前留下的經驗是否仍然有幫助。

先看沒有 library 的情況。Code，也就是程式工作的分數，從原本的 73.4 掉到 63.2，Web 這類網頁工作的分數也下降。
如果提供之前用 k 等於 5 累積的 library，三類工作的分數就都高於 base。像 Office 這類辦公工作，就從 74.0 到 79.1。
這裡的 k 等於 5，指的是之前建立 library 時用了比較多探索。現在這一題直接修改時，可以參考那些探索留下的經驗。

右邊再看換 benchmark 的情況。這次先在 JobBench 的職業工作裡累積 library，再把這份 library 提供給 WorkBuddy 的 editor，照常做一次完整的 refinement。

我們把它和原本的一次 improvement step 比較。加入 JobBench 經驗之後，Code 從 76.5 到 77.1，Web 從 76.4 到 76.9，Office 則從 79.5 到 82.4，多了 2.9 points。
這表示先前的修改經驗，也能幫助另一套 benchmark 裡的 task。使用時，editor 仍然會根據新 task 的要求，調整要採用的 component。

來源：Figure 7 · §4 · pp. 10–11。

---

## Slide 12 — What does Harness² establish?

最後，這篇的做法可以從三個動作來理解。

第一個是 Adapt。遇到目前的 task，先觀察原本怎麼執行，再提出修改、實際測試，整合成新的 harness。

第二個是 Remember。Task 做完之後，把可以重用的 component 和修改經驗留下來，說清楚什麼情況適用，以及哪些執行證據支持這個做法。

第三個是 Reuse。之後遇到新 task，editor 就可以參考這些經驗，挑選適合的 component，調整成這一題需要的版本。

實驗裡，一次 improvement step 就能改善三個 benchmark、四種配置的 base 表現。增加探索還能繼續提升分數，而拿掉 library、editor 分工或 composition，表現都會下降。
Library 的實驗也顯示，之後即使沒有新的 probe，或是換到另一個 benchmark，先前留下的經驗仍然能幫助 editor 修改 harness。

來源：§6, p. 13 · Tables 1–3 · Figure 7。

---

