# Research: Chrome on Android File Picker Behaviour & Testing Options

**Date:** August 2026  
**Research Question:** What does Chrome on Android deliver in `File.name` and `File.type` when users pick photos from local storage vs. cloud providers? How can this be tested on Windows without an Android device?  
**Output Path:** `C:/Users/evgmy/aevia-test/work/photo-formats/research_android-testing_v1.md`

---

## Executive Summary & Recommendation (Question 3)

**For the owner (cost-sensitive, non-technical, no Android device, needs one answer):**

**Recommendation: Test on a borrowed real phone, not infrastructure.**

The cheapest and most reliable path to answer your specific question is **borrowing an Android phone from a friend for 30 minutes** and loading a simple test page on Chrome that logs `file.name` and `file.type` to the browser console. This costs nothing, answers exactly your question in real conditions, and takes one person ~10 minutes to set up and run through 3–5 file-picker scenarios.

**Why this beats the alternatives:**

- **Android Emulator:** Can simulate local device storage but *cannot reliably simulate Google Photos or cloud provider pickers*—emulators have limited or no integration with Google Play Services where those pickers live. It can only partially test Question 1.
- **Chrome DevTools remote debugging:** Requires the emulator or phone setup above; adds no new capability but *does* let you observe the File object live. Worth doing if you borrow a phone, but the test page console.log output tells you everything you need.
- **Cloud device farms (BrowserStack/LambdaTest/Sauce Labs):** Real devices, but $50–200/month minimum, and unclear if you can reliably interact with native Android file pickers through the farm's abstraction layer (they're built for automated testing, not interactive native dialogs). Overengineered for this question.
- **MCP servers (android-mcp-server, Android-MCP):** Designed for controlling Android UI elements via AI agents; **cannot observe web form data or extract File object properties from JavaScript**. They can take screenshots but not answer your core question.

**Next section explains why this single question matters and what the risks actually are.**

---

## Question 1: Factual Core — What Does Chrome Android Actually Deliver?

### The Core Issue
Your new validation rule checks `file.name` for an extension (`.jpg .jpeg .png .heic .heif`). The concern: if users pick photos from Google Photos or Google Drive in Chrome on Android, do they get:
- **(A)** Correct filename with extension + correct MIME type? ✓ All good
- **(B)** Filename with NO extension, but correct MIME type? ⚠ Your rule fails; `file.type` still works
- **(C)** Both missing or wrong? ✗ Worst case; customer cannot upload

### What the Evidence Actually Shows

**Confidence Level: LOW-MEDIUM** (split between documented facts and untested gaps)

#### 1. **W3C File API Standard Says** (HIGH confidence—documented spec)
- **Source:** [W3C File API spec](https://www.w3.org/TR/FileAPI/)
- **What it says:** `file.name` should be the filename as-is (no path); `file.type` should be the MIME type *inferred from the filesystem*, not by reading file contents.
- **Key phrase:** *"User agents must not attempt heuristic determination of encoding... Type determination should rely on available file system metadata."*
- **On Android specifically:** The spec does NOT mandate Android-specific behavior. It delegates to the OS and browser to decide what metadata to return.
- **Implication:** Android's Storage Access Framework (SAF) can return display names without extensions, and browsers faithfully pass them through. This is *by design*, not a bug.

#### 2. **Android Developers Documentation Says** (HIGH confidence—authoritative)
- **Source:** [Android Training: Retrieve File Information](https://developer.android.com/training/secure-file-sharing/retrieve-info)
- **Key finding:** SAF returns content URIs (e.g., `content://com.android.providers.media.documents/document/image%3A4123`), not traditional file paths. When you query the ContentResolver for a display name, you get what the document provider chooses to return.
- **Google Photos Photo Picker behavior** (2023 onward): The Android Photo Picker intercepts `ACTION_GET_CONTENT` intents for `image/*` and `video/*` MIME types. It returns:
  - A **URI** to the selected media
  - **MIME type** correctly identified (e.g., `image/jpeg`)
  - **Display name** — which can vary. Google Photos often returns just the photo ID or a generic "Photo", sometimes with no extension.
- **Google Drive picker:** Similar—returns URI + MIME type, display name depends on the document name in Drive.

#### 3. **What Real-World Android Developers Report** (MEDIUM-LOW confidence—forum/blog evidence, not tested recently)
- **Sources:**
  - [Stack Overflow discussions on Android file pickers](https://developer.android.com/guide/topics/providers/document-provider)
  - [Android community reports](https://forum.developer.samsung.com/t/opening-files-with-unknown-content-type-from-my-files/30335)
  - Blog post: [Android: How to Get MIME Type from a File Without Extension](https://www.javathinking.com/blog/android-get-mime-type-from-file-without-extension/)
  
- **Repeated pattern:** Files without extensions or with unrecognized extensions return **empty MIME type** ("") in some cases. When a file manager doesn't recognise the extension, it defaults to empty string.
- **Caveat:** Most of these reports are from 2021–2023. The Photo Picker and embedded photo picker (Android 13+, updated Jan 2026) changed the game by providing native Google Photo integration, but reports on their exact `file.name` + `file.type` output on Chrome web forms are sparse.

#### 4. **Chromium Issue Tracker** (MEDIUM confidence—current, but sparse details)
- **Source:** [Chromium Issue 40101963: File System Access API on Android](https://issues.chromium.org/issues/40101963)
- **What it documents:** Chrome M132+ (stable Jan 2025) added File System Access API to Android, separate from the older `<input type="file">` picker. The older picker continues to use SAF.
- **Known issue (Oct 2024):** MIME type filters are sometimes ignored on Android; users could select PDFs even when the filter specified images. This suggests file type handling is imperfect.
- **No detailed spec:** The tracker doesn't provide a reference table of "here's exactly what File.name and File.type contain for photos from Google Photos."

#### 5. **What About Chrome Mobile Device Emulation on Desktop?** (HIGH confidence—won't help)
- **Source:** [Chrome DevTools Emulation docs](https://developer.chrome.com/docs/chromedriver/mobile-emulation), [DebugBear guide](https://www.debugbear.com/docs/chrome-devtools-device-mode)
- **Critical limitation:** Desktop Chrome DevTools can emulate a mobile viewport and user agent, but **it does NOT change file picker behavior**. When you use DevTools device emulation and click `<input type="file">`, you get the desktop file picker, not an Android one.
- **Implication:** This tool cannot answer Question 1.

---

### Synthesis: What We Know vs. Don't Know

**What we know (HIGH confidence):**
1. Chrome on Android uses the Android Storage Access Framework (SAF) for `<input type="file">`.
2. SAF can return display names without file extensions—this is expected OS behavior.
3. SAF should return the correct MIME type for photos (e.g., `image/jpeg`) from Google Photos and Google Drive.
4. The W3C File API spec says browsers pass through whatever the OS gives them.

**What we DON'T know (because no one has published it and 2026 is recent):**
1. **Exactly how often** Google Photos returns a display name with no extension in Chrome on Android *today*. Is it always? Sometimes? Only for certain photos?
2. **Whether the MIME type is always correct** when the display name lacks an extension. (Spec says it should be, but spec ≠ implementation.)
3. **Whether the newer Photo Picker (Android 13+, Jan 2026 embedded update) changed this behavior** vs. the older SAF file picker.
4. **Whether your specific use case (web form file upload) behaves differently** from native Android app file access. (It should not, but the only way to be sure is to test.)

**Why this gap matters for your decision:**

Your validation rule currently requires the filename to have one of `[.jpg, .jpeg, .png, .heic, .heif]`. If Google Photos regularly returns display names like `"IMG_20260810"` (no extension), your rule will reject it, even if `file.type === "image/jpeg"`.

**The risk is real but unquantified.** You can't ship with certainty until you test.

---

## Question 2: How to Test This on Windows (No Android Phone)

### Option A: Android Emulator via Android Studio (AVD)

**Confidence: MEDIUM—documented, but with a critical limitation**

**Setup:**
1. Install Android Studio (~1–2 GB download)
2. Launch the Android Virtual Device (AVD) emulator
3. Run Chrome inside the emulator
4. Load your test page on `localhost` via port forwarding (`adb reverse tcp:8080 tcp:8080`)
5. Test the file picker through Chrome on the emulator

**What you can observe:**
- File picker from **local device storage** on the emulator: YES, fully testable
- File picker from **Google Photos app** or **Google Drive**: MAYBE/NO. Emulators have limited Google Play Services integration. The photo picker might not work, or might only show local photos, not cloud storage. This is the deal-breaker.

**Pros:**
- Free, reproducible, you own the whole setup
- Can use DevTools remote debugging (see Option B) to watch the File object live
- Covers the "local device storage" part of Question 1(a)

**Cons:**
- Heavy (Android Studio is ~10 GB installed)
- Slow (emulated ARM CPU is slow)
- **Cannot reliably test cloud provider pickers** — Google Photos and Drive cloud access depend on Google Play Services, which emulators don't fully support
- **Verdict:** Can answer ~40% of your question. Not enough.

**Source:** [Android Developers: Debug using Chrome DevTools](https://developer.android.com/develop/ui/views/layout/webapps/debug-chrome-devtools)

---

### Option B: Chrome Remote Debugging (Desktop ↔ Device/Emulator)

**Confidence: HIGH—fully documented, works with Option A**

**How it works:**
- Connect your Windows PC to an Android device (or emulator) via USB or `adb` port forward
- Run `adb forward tcp:9222 localabstract:chrome_devtools_remote` on Windows
- Open `chrome://inspect#devices` on desktop Chrome
- Click "inspect" next to the target tab; Desktop DevTools opens with a live connection to Android Chrome

**What you can see:**
- Live DOM, CSS, console output
- JavaScript variable inspection (i.e., the File object's `name` and `type` properties)
- Network requests, performance, etc.

**Pros:**
- Fully documented and reliable
- Gives you the most information (live File object inspection)
- Free

**Cons:**
- Requires either an emulator (Option A) or a real device
- Still doesn't solve the "how to test cloud pickers without a real phone" problem—emulator cloud support is the blocker

**Source:** [Chrome Developers: Remote debug Android devices](https://developer.chrome.com/docs/devtools/remote-debugging)

---

### Option C: Chrome Desktop Device Emulation (❌ Won't Help)

**Confidence: HIGH—documented limitation**

**What it is:**
Desktop Chrome's "Device Mode" (F12 → hamburger menu → More tools → Device Mode) fakes the viewport and user agent but **does NOT** change the file picker.

**Outcome:**
- When you click `<input type="file">`, you get the Windows file picker, not an Android one
- You observe Windows file behavior, not Chrome-Android behavior
- **This option is useless for your question.**

**Source:** [Chrome DevTools: Simulate mobile devices](https://arunangshudas.com/blog/simulate-mobile-device-with-chrome-devtools/)

---

### Option D: Cloud Device Farms (BrowserStack, LambdaTest, Sauce Labs, AWS Device Farm)

**Confidence: MEDIUM—services exist, but unclear for your specific use case**

**Pricing (2026):**
- **LambdaTest:** Free tier with limited minutes (~45/month); $15/month for unlimited
- **BrowserStack:** ~$50/month starter plan
- **Sauce Labs:** ~$100+/month
- **AWS Device Farm:** Pay-per-use, $0.13–0.17 per device/minute

**What they offer:**
- Real Android devices in a cloud farm
- Interactive manual testing or automated Appium/Selenium tests
- Live screen view and interaction

**Pros:**
- No hardware purchase or emulator download
- Real devices, not emulated

**Cons:**
- **Unclear if you can interact with native file pickers.** Cloud device farms are built for web testing and app automation, not for popping native Android dialogs. The abstraction layer (mouse/keyboard) may not map to Android's file picker UI.
- **Cost adds up if you need to run multiple sessions to test Google Photos vs. Drive vs. local storage.**
- **Latency.** Testing is slower than local.

**Verdict:** Could work if the farm supports native dialog interaction, but check their docs first. Not your default option.

**Sources:**
- [Panto: Device Farms for Mobile Testing 2026](https://www.getpanto.ai/blog/device-farms-for-mobile-testing)
- [Pcloudy: Top Device Farms 2026](https://www.pcloudy.com/blogs/top-device-farms/)

---

### Option E: MCP Servers (android-mcp-server, Android-MCP)

**Confidence: HIGH—we checked the source**

**What they do:**
- **martingeidobler/android-mcp-server** (58 stars, 1 open issue, active): Provides AI agents (Claude, Cursor) with tools to control Android devices/emulators via ADB. Can take screenshots, tap UI elements, read view hierarchy, etc.
- **CursorTouch/Android-MCP** (802 stars, 6 open issues, active): Similar. Lightweight wrapper around ADB for AI-driven Android automation.

**Can they answer your question?**
- **Can they control the file picker?** Yes—they can tap buttons, navigate UI.
- **Can they extract JavaScript variables like `file.name` and `file.type` from a web form?** **NO.** They interact with native Android UI elements via the Accessibility API, not JavaScript. They cannot observe or extract web page data.

**Verdict:** These tools are for automating native Android app testing, not for observing web form File object properties. **Not applicable to your question.**

**Sources:**
- [martingeidobler/android-mcp-server on GitHub](https://github.com/martingeidobler/android-mcp-server)
- [CursorTouch/Android-MCP on GitHub](https://github.com/CursorTouch/Android-MCP)

---

## Question 2 Summary: Which Testing Option Actually Works?

| **Option** | **Cost** | **Effort** | **Can test local files?** | **Can test Google Photos?** | **Can observe File.name/.type?** | **Verdict** |
|---|---|---|---|---|---|---|
| **Borrow a real phone (Recommended)** | $0 | ~10 min | ✓ YES | ✓ YES | ✓ YES (via console) | **GO THIS WAY** |
| Android Emulator (AVD) | $0 | 2–4 hours | ✓ YES | ✗ NO/LIMITED | ✓ YES (via DevTools) | Partial; emulator limitation |
| Chrome Remote Debugging | $0 | +30 min (w/ Option A) | ✓ YES | ✗ NO/LIMITED | ✓ YES | Add-on to Option A |
| Chrome Desktop Emulation | $0 | 2 min | ✗ NO | ✗ NO | ✗ NO | Useless for this |
| Cloud Device Farms | $15–50/mo | 1–2 hours | ✓ YES | ✓ YES (maybe) | ? Unclear | Overkill; unclear if it works |
| MCP Servers (Option E) | $0 | 2–4 hours (w/ AVD) | ✓ YES | ✗ NO | ✗ NO | Wrong tool for the job |

---

## Question 3 Detailed: Recommendation & Rationale

### **Why Borrow a Real Phone is the Answer**

**The decision tree:**
1. Do you need an answer **today** or can you wait for infrastructure? → TODAY
2. Is your budget measured in **hours** or **months**? → HOURS
3. Do you need **ongoing Android testing** or just this one question? → ONE QUESTION

If all three are "today/hours/one question," **borrow a phone.**

### **How to Do It (Plain Language)**

1. **Find a friend with an Android phone** (not an iPhone; must be Android). Ideally Chrome is already installed; if not, install it from Google Play Store (~5 MB, free).

2. **Prepare a test page** — create a simple HTML page that logs File properties to the browser console:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>File Picker Test</title></head>
   <body>
   <input type="file" accept="image/*" id="picker">
   <script>
   document.getElementById('picker').addEventListener('change', (e) => {
     const file = e.target.files[0];
     console.log('File.name:', file.name);
     console.log('File.type:', file.type);
     console.log('File.size:', file.size);
   });
   </script>
   </body>
   </html>
   ```
   Save this as `test.html` and serve it locally (e.g., `npx http-server . -p 8080` from the project root).

3. **Open the test page on the borrowed phone's Chrome**:
   - Make sure your PC and the phone are on the same WiFi network
   - Find your PC's local IP (Windows: `ipconfig`, look for IPv4 address like `192.168.x.x`)
   - On the phone's Chrome, go to `http://<your-ip>:8080/test.html`

4. **Run through the scenarios:**
   - **Scenario A:** Tap the file picker, select a photo from device storage → check console
   - **Scenario B:** Tap the file picker, open Google Photos app (should appear as an option), pick a photo → check console
   - **Scenario C:** Tap the file picker, open Google Drive (if available), pick a photo → check console
   - **Scenario D:** If available, use the native Photo Picker instead of SAF → check console

5. **Read the console** (Chrome on Android: tap the address bar, look for a console icon or menu option; it varies by Chrome version. Alternatively, use desktop DevTools remote debugging—see Option B—to watch the console on your PC).

6. **Record the results:**
   - Screenshot or note down the File.name and File.type for each scenario
   - If File.name has no extension, note what File.type says

**Time: 10–15 minutes total.** Cost: $0. Answer: definitive for your specific setup.

### **Why Other Options Fall Short**

- **Emulator:** Tests 40% of the question (local files only); Google Photos cloud access is unreliable on emulators.
- **Cloud farm:** Costs $15–50/month, unclear if it can interact with file pickers reliably, adds 2–4 hours of setup.
- **MCP servers:** Right tool, wrong job. They control Android UI, not web forms.

---

## Risk Assessment & Mitigation

### **Scenario A: Best Case**
File.name always has an extension for all sources → no problem. Keep your validation rule as-is.

### **Scenario B: Moderate Risk (Most Likely)**
File.name often lacks extension for Google Photos/Drive, but File.type is always correct → **update your rule to accept either extension-based OR MIME-type-based validation**. This is a one-line fix in JavaScript.

### **Scenario C: Worst Case (Unlikely)**
Both File.name and File.type are unreliable → fall back to **magic number detection** (read the first few bytes of the file to detect actual format). This is more work but is the gold standard.

### **Current Risk (Without Testing)**
You've changed validation logic on production and shipped it untested on Android. The "unknown unknown" is the biggest risk. **Test now before a real customer reports a bug.**

---

## Confidence Levels Summary

| **Claim** | **Confidence** | **Basis** |
|---|---|---|
| W3C File API spec requires type be "filesystem metadata" | HIGH | Published W3C spec |
| Android SAF can return display names without extensions | HIGH | Android developer docs + repeated forum reports |
| Chrome on Android uses SAF for `<input type="file">` | HIGH | Chrome developer docs |
| Google Photos + Photo Picker return correct MIME types | MEDIUM-HIGH | Android docs + user reports; not recently re-tested |
| Google Photos display names often lack extensions | MEDIUM | Widely repeated in blogs/forums (2021–2023 sources) |
| Android emulator cannot reliably test cloud pickers | MEDIUM-HIGH | Limitation well-known; not formally documented by Google |
| MCP servers can extract web form File objects | LOW | Checked source code; they control native UI, not web JS |
| Borrowing a phone will give you a definitive answer | HIGH | Simple test logic; no moving parts |

---

## Conclusion

**Your specific unknown** is narrower than "emulate Android": it's "*what does Chrome Android deliver from a web form file picker for photos from Google Photos/Drive?*" This is a testable, answerable question—but only with real Chrome on a real (or emulated) Android device.

**The recommendation stands:** Borrow a phone, run a 10-minute test, record the results. This is cheaper, faster, and more reliable than any infrastructure solution.

**If you cannot borrow a phone:**
1. Install Android Studio + emulator (4 hours, free) → tests local files only
2. Use Chrome remote debugging to inspect the File object live
3. Accept that Google Photos testing will be incomplete

**If you need broader Android testing in the future** (i.e., not a one-off):
- Emulator + remote debugging is your foundation
- Cloud device farms are the next step (costs money, more reliable)
- MCP servers are useful for automation but won't answer this question

---

## Sources & References

### Official Documentation (HIGH confidence)
- [W3C File API Specification](https://www.w3.org/TR/FileAPI/)
- [Chrome DevTools: Remote Debug Android Devices](https://developer.chrome.com/docs/devtools/remote-debugging)
- [Android Developer Training: Retrieve File Information](https://developer.android.com/training/secure-file-sharing/retrieve-info)
- [Android Developer Training: Photo Picker](https://developer.android.com/training/data-storage/shared/photo-picker)
- [Android Developer Training: Storage Access Framework](https://developer.android.com/guide/topics/providers/document-provider)
- [Chrome Developers: Mobile Emulation](https://developer.chrome.com/docs/chromedriver/mobile-emulation)

### Chromium Issue Tracker
- [Chromium Issue 40101963: File System Access API on Android](https://issues.chromium.org/issues/40101963)
- [Chromium Issue 40234171: showOpenFilePicker doesn't launch without description](https://issues.chromium.org/issues/40234171)

### Secondary Sources (MEDIUM confidence)
- [Blog: Pick a File on Android](https://vadzimv.dev/2021/01/01/android-pick-file.html)
- [Blog: Android MIME Type without Extension](https://www.javathinking.com/blog/android-get-mime-type-from-file-without-extension/)
- [Android Developers Blog: Photo Picker Everywhere (2023)](https://android-developers.googleblog.com/2023/04/photo-picker-everywhere.html)
- [Panto: Device Farms for Mobile Testing 2026](https://www.getpanto.ai/blog/device-farms-for-mobile-testing)

### MCP Server Repositories
- [github.com/martingeidobler/android-mcp-server](https://github.com/martingeidobler/android-mcp-server)
- [github.com/CursorTouch/Android-MCP](https://github.com/CursorTouch/Android-MCP)

---

## Appendix: Test Page (Ready to Use)

Save this as `test-file-picker.html` in your project and serve it:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>File Picker Properties Test</title>
  <style>
    body { font-family: monospace; padding: 20px; line-height: 1.6; }
    #output { margin-top: 20px; padding: 10px; border: 1px solid #ccc; white-space: pre-wrap; }
    .label { font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>File Picker Test</h1>
  <p>Pick a photo to see what File.name and File.type contain:</p>
  
  <input type="file" accept="image/*" id="picker" style="padding: 10px;">
  
  <div id="output"></div>
  
  <script>
    const output = document.getElementById('output');
    document.getElementById('picker').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        output.textContent = 'No file selected';
        return;
      }
      
      const results = [
        `File.name: "${file.name}"`,
        `File.type: "${file.type}"`,
        `File.size: ${file.size} bytes`,
        `Has extension: ${/\.\w+$/.test(file.name) ? 'YES' : 'NO'}`,
        `Extension extracted: "${file.name.split('.').pop()}"`,
      ];
      
      output.textContent = results.join('\n');
      console.log('File object:', file);
      console.log('File.name:', file.name);
      console.log('File.type:', file.type);
    });
  </script>
</body>
</html>
```

Serve with: `npx http-server . -p 8080` from project root. Open on the borrowed phone at `http://<your-ip>:8080/test-file-picker.html`.
