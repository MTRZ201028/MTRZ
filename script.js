const TEXT = {
  themeDark: "Dark Mode",
  themeLight: "Light Mode",
  cameraDefaultResult: "No scan yet.",
  uploadDefaultResult: "No image uploaded yet.",
  noFileSelected: "No file selected.",
  chosenFilePrefix: "Selected file:",
  errLibrary: "QR library failed to load.",
  errInputRequired: "Please enter text or URL first.",
  successGenerated: "QR code generated successfully.",
  errGenerate: "Failed to generate QR code.",
  successDownloaded: "QR image downloaded.",
  errNoQrToDownload: "No generated QR to download.",
  errNoCamera: "No camera is available on this device.",
  errCameraStart: "Unable to start camera. Please allow camera access.",
  successCameraStarted: "Camera started.",
  successCameraStopped: "Camera stopped.",
  successCameraRead: "QR detected from camera.",
  errUnsupportedFile: "Unsupported file type. Use PNG, JPG, or WEBP.",
  errNoQrInImage: "No QR code found in this image.",
  successImageRead: "QR extracted from image.",
  errInputTooLong: "Input is too long. Please use 3000 characters or less.",
  errDecoderLoad: "QR decoder failed to load.",
};

const state = { theme: "light", lastGenerated: "", toastTimer: null, scannerScriptPromise: null };
const LIMITS = { maxQrInputLength: 3000 };

const dom = {
  qrInput: document.getElementById("qr-input"),
  qrSize: document.getElementById("qr-size"),
  qrSizeValue: document.getElementById("qr-size-value"),
  qrQuality: document.getElementById("qr-quality"),
  qrFgColor: document.getElementById("qr-fg-color"),
  qrBgColor: document.getElementById("qr-bg-color"),
  generateBtn: document.getElementById("generate-btn"),
  qrContainer: document.getElementById("qr-container"),
  downloadBtn: document.getElementById("download-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  tabButtons: Array.from(document.querySelectorAll(".tab-btn")),
  panels: Array.from(document.querySelectorAll(".panel")),
  toast: document.getElementById("toast"),
  startScanBtn: document.getElementById("start-scan-btn"),
  stopScanBtn: document.getElementById("stop-scan-btn"),
  scanResult: document.getElementById("scan-result"),
  openLinkBtn: document.getElementById("open-link-btn"),
  cameraLoading: document.getElementById("camera-loading"),
  qrFile: document.getElementById("qr-file"),
  uploadTriggerBtn: document.getElementById("upload-trigger-btn"),
  fileName: document.getElementById("file-name"),
  uploadPreview: document.getElementById("upload-preview"),
  uploadResult: document.getElementById("upload-result"),
  openUploadLinkBtn: document.getElementById("open-upload-link-btn"),
  uploadLoading: document.getElementById("upload-loading"),
};

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showToast(message, type = "success") {
  if (state.toastTimer) clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  dom.toast.classList.remove("error", "show");
  if (type === "error") dom.toast.classList.add("error");
  requestAnimationFrame(() => dom.toast.classList.add("show"));
  state.toastTimer = setTimeout(() => {
    dom.toast.classList.remove("show");
    setTimeout(() => {
      dom.toast.hidden = true;
    }, 220);
  }, 2200);
}

async function ensureScannerLibraryLoaded() {
  if (window.Html5Qrcode) return;
  if (state.scannerScriptPromise) return state.scannerScriptPromise;
  state.scannerScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("scanner library failed to load"));
    document.body.appendChild(script);
  });
  return state.scannerScriptPromise;
}

const ThemeModule = {
  apply(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("dark", state.theme === "dark");
    localStorage.setItem("qr-theme", state.theme);
    this.syncToggleLabel();
  },
  syncToggleLabel() {
    dom.themeToggle.textContent = state.theme === "dark" ? TEXT.themeLight : TEXT.themeDark;
  },
  init() {
    const stored = localStorage.getItem("qr-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.apply(stored || (systemDark ? "dark" : "light"));
    dom.themeToggle.addEventListener("click", () => {
      this.apply(state.theme === "dark" ? "light" : "dark");
    });
  },
};

const GeneratorModule = {
  getQrLevel(level) {
    if (!window.QRCode?.CorrectLevel) return undefined;
    return window.QRCode.CorrectLevel[level] ?? window.QRCode.CorrectLevel.M;
  },
  clear() {
    dom.qrContainer.innerHTML = "";
    state.lastGenerated = "";
    dom.downloadBtn.disabled = true;
  },
  generate(showInputError = true) {
    if (!window.QRCode) {
      showToast(TEXT.errLibrary, "error");
      return;
    }
    const text = dom.qrInput.value.trim();
    const width = Number(dom.qrSize.value);
    dom.qrSizeValue.textContent = String(width);

    if (!text) {
      this.clear();
      if (showInputError) showToast(TEXT.errInputRequired, "error");
      return;
    }
    if (text.length > LIMITS.maxQrInputLength) {
      this.clear();
      showToast(TEXT.errInputTooLong, "error");
      return;
    }

    try {
      dom.qrContainer.innerHTML = "";
      new QRCode(dom.qrContainer, {
        text,
        width,
        height: width,
        colorDark: dom.qrFgColor.value,
        colorLight: dom.qrBgColor.value,
        correctLevel: this.getQrLevel(dom.qrQuality.value),
      });
      dom.qrContainer.classList.remove("pop");
      void dom.qrContainer.offsetWidth;
      dom.qrContainer.classList.add("pop");
      dom.downloadBtn.disabled = false;
      state.lastGenerated = text;
      showToast(TEXT.successGenerated);
    } catch {
      dom.downloadBtn.disabled = true;
      showToast(TEXT.errGenerate, "error");
    }
  },
  download() {
    const qrCanvas = dom.qrContainer.querySelector("canvas");
    const qrImage = dom.qrContainer.querySelector("img");
    const dataUrl = qrCanvas ? qrCanvas.toDataURL("image/png") : qrImage?.src || "";
    if (!dataUrl) {
      showToast(TEXT.errNoQrToDownload, "error");
      return;
    }
    const link = document.createElement("a");
    link.download = "qr-code.png";
    link.href = dataUrl;
    link.click();
    showToast(TEXT.successDownloaded);
  },
  init() {
    dom.generateBtn.addEventListener("click", () => this.generate(true));
    dom.downloadBtn.addEventListener("click", () => this.download());
    dom.qrInput.addEventListener("input", () => {
      if (dom.qrInput.value.trim()) this.generate(false);
    });
    [dom.qrSize, dom.qrQuality, dom.qrFgColor, dom.qrBgColor].forEach((el) => {
      el.addEventListener("input", () => {
        if (state.lastGenerated) this.generate(false);
      });
      el.addEventListener("change", () => {
        if (state.lastGenerated) this.generate(false);
      });
    });
    this.clear();
  },
};

const CameraModule = {
  scanner: null,
  state: {
    videoStream: null,
    cameraActive: false,
    scanResult: "",
  },
  async getScanner() {
    await ensureScannerLibraryLoaded();
    if (!this.scanner) this.scanner = new Html5Qrcode("camera-reader");
    return this.scanner;
  },
  setLoading(active) {
    dom.cameraLoading.hidden = !active;
  },
  setResult(text, toastOnSuccess = true) {
    this.state.scanResult = text || "";
    dom.scanResult.textContent = this.state.scanResult || TEXT.cameraDefaultResult;
    dom.openLinkBtn.disabled = !isValidHttpUrl(this.state.scanResult);
    if (toastOnSuccess && this.state.scanResult) showToast(TEXT.successCameraRead);
  },
  async start() {
    if (this.state.cameraActive) return;
    try {
      await ensureScannerLibraryLoaded();
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        this.setResult(TEXT.errNoCamera, false);
        showToast(TEXT.errNoCamera, "error");
        TabsModule.activate("upload");
        return;
      }
      const scanner = await this.getScanner();
      this.setLoading(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => this.setResult(decodedText, true),
        () => {}
      );
      this.state.cameraActive = true;
      this.state.videoStream = "active";
      dom.startScanBtn.disabled = true;
      dom.stopScanBtn.disabled = false;
      showToast(TEXT.successCameraStarted);
    } catch {
      this.setResult(TEXT.errCameraStart, false);
      showToast(TEXT.errCameraStart, "error");
    } finally {
      this.setLoading(false);
    }
  },
  async stop() {
    if (!this.state.cameraActive || !this.scanner) return;
    try {
      await this.scanner.stop();
      await this.scanner.clear();
    } catch {
      // no-op
    } finally {
      this.state.cameraActive = false;
      this.state.videoStream = null;
      dom.startScanBtn.disabled = false;
      dom.stopScanBtn.disabled = true;
      showToast(TEXT.successCameraStopped);
    }
  },
  async reset() {
    if (this.state.cameraActive) await this.stop();
    this.state.scanResult = "";
    this.setResult(TEXT.cameraDefaultResult, false);
    const reader = document.getElementById("camera-reader");
    if (reader) reader.innerHTML = "";
  },
  init() {
    dom.startScanBtn.addEventListener("click", () => this.start());
    dom.stopScanBtn.addEventListener("click", () => this.stop());
    dom.openLinkBtn.addEventListener("click", () => {
      if (isValidHttpUrl(this.state.scanResult)) {
        window.open(this.state.scanResult, "_blank", "noopener,noreferrer");
      }
    });
    dom.startScanBtn.disabled = false;
    dom.stopScanBtn.disabled = true;
    this.setResult(TEXT.cameraDefaultResult, false);
    this.setLoading(false);
  },
};

const UploadModule = {
  allowedImageTypes: ["image/png", "image/jpeg", "image/webp"],
  maxDimension: 1600,
  state: {
    selectedFile: null,
    imagePreview: "",
    qrResult: "",
  },
  setLoading(active) {
    dom.uploadLoading.hidden = !active;
  },
  setResult(text, toastOnSuccess = true) {
    this.state.qrResult = text || "";
    dom.uploadResult.textContent = this.state.qrResult || TEXT.uploadDefaultResult;
    dom.openUploadLinkBtn.disabled = !isValidHttpUrl(this.state.qrResult);
    if (toastOnSuccess && this.state.qrResult) showToast(TEXT.successImageRead);
  },
  setPreview(file) {
    if (this.state.imagePreview) URL.revokeObjectURL(this.state.imagePreview);
    const previewUrl = URL.createObjectURL(file);
    this.state.imagePreview = previewUrl;
    dom.uploadPreview.src = previewUrl;
    dom.uploadPreview.hidden = false;
  },
  async loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      img.src = objectUrl;
    });
  },
  canvasFromImage(img) {
    const scale = Math.min(1, this.maxDimension / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  },
  rotateCanvas(sourceCanvas, angleDeg) {
    const angle = (angleDeg * Math.PI) / 180;
    const swap = angleDeg % 180 !== 0;
    const canvas = document.createElement("canvas");
    canvas.width = swap ? sourceCanvas.height : sourceCanvas.width;
    canvas.height = swap ? sourceCanvas.width : sourceCanvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    return canvas;
  },
  processImageData(imageData, mode) {
    const out = new ImageData(imageData.width, imageData.height);
    const src = imageData.data;
    const dst = out.data;
    const contrast = mode === "high-contrast" ? 1.45 : 1;
    const brightness = mode === "bright" ? 12 : 0;
    const threshold = mode === "threshold" ? 126 : -1;

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      gray = (gray - 128) * contrast + 128 + brightness;
      gray = Math.max(0, Math.min(255, gray));
      if (threshold >= 0) {
        gray = gray > threshold ? 255 : 0;
      }
      dst[i] = gray;
      dst[i + 1] = gray;
      dst[i + 2] = gray;
      dst[i + 3] = 255;
    }
    return out;
  },
  decodeCanvasWithVariants(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const base = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const modes = ["original", "grayscale", "high-contrast", "bright", "threshold"];

    for (let i = 0; i < modes.length; i += 1) {
      const mode = modes[i];
      let data = base;
      if (mode !== "original") {
        data = this.processImageData(base, mode);
      }
      const decoded = window.jsQR(
        data.data,
        data.width,
        data.height,
        { inversionAttempts: "attemptBoth" }
      );
      if (decoded?.data) {
        return decoded.data;
      }
    }
    return null;
  },
  async scanFile(file) {
    if (!file) return;
    this.state.selectedFile = file;
    if (!this.allowedImageTypes.includes(file.type)) {
      this.setResult(TEXT.errUnsupportedFile, false);
      showToast(TEXT.errUnsupportedFile, "error");
      return;
    }
    if (!window.jsQR) {
      this.setResult(TEXT.errDecoderLoad, false);
      showToast(TEXT.errDecoderLoad, "error");
      return;
    }

    this.setPreview(file);
    this.setLoading(true);
    try {
      const image = await this.loadImageElement(file);

      const baseCanvas = this.canvasFromImage(image);

      const rotations = [0, 90, 180, 270];
      let decodedText = null;
      for (let i = 0; i < rotations.length; i += 1) {
        const rotation = rotations[i];
        const candidate = rotation === 0 ? baseCanvas : this.rotateCanvas(baseCanvas, rotation);
        decodedText = this.decodeCanvasWithVariants(candidate);
        if (decodedText) {
          break;
        }
      }

      if (!decodedText) {
        throw new Error("No QR code found");
      }
      this.setResult(decodedText, true);
    } catch {
      this.setResult(TEXT.errNoQrInImage, false);
      showToast(TEXT.errNoQrInImage, "error");
    } finally {
      this.setLoading(false);
    }
  },
  reset() {
    if (this.state.imagePreview) URL.revokeObjectURL(this.state.imagePreview);
    this.state.selectedFile = null;
    this.state.imagePreview = "";
    this.state.qrResult = "";
    dom.qrFile.value = "";
    dom.uploadPreview.hidden = true;
    dom.uploadPreview.removeAttribute("src");
    dom.fileName.textContent = TEXT.noFileSelected;
    this.setResult(TEXT.uploadDefaultResult, false);
    this.setLoading(false);
  },
  init() {
    dom.uploadTriggerBtn.addEventListener("click", () => dom.qrFile.click());
    dom.qrFile.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        dom.fileName.textContent = TEXT.noFileSelected;
        return;
      }
      dom.fileName.textContent = `${TEXT.chosenFilePrefix} ${file.name}`;
      this.scanFile(file);
    });
    dom.openUploadLinkBtn.addEventListener("click", () => {
      if (isValidHttpUrl(this.state.qrResult)) {
        window.open(this.state.qrResult, "_blank", "noopener,noreferrer");
      }
    });
    this.reset();
  },
};

const TabsModule = {
  active: "generate",
  async activate(tabId) {
    this.active = tabId;
    dom.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
    dom.panels.forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tabId}`));
    if (tabId === "camera") UploadModule.reset();
    if (tabId === "upload") await CameraModule.reset();
  },
  init() {
    dom.tabButtons.forEach((button, index) => {
      button.addEventListener("click", () => this.activate(button.dataset.tab));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const nextIndex = event.key === "ArrowRight"
          ? (index + 1) % dom.tabButtons.length
          : (index - 1 + dom.tabButtons.length) % dom.tabButtons.length;
        dom.tabButtons[nextIndex].focus();
        this.activate(dom.tabButtons[nextIndex].dataset.tab);
      });
    });
  },
};

async function bootstrap() {
  ThemeModule.init();
  TabsModule.init();
  GeneratorModule.init();
  CameraModule.init();
  UploadModule.init();
  await TabsModule.activate("generate");
}

window.addEventListener("beforeunload", async () => {
  await CameraModule.reset();
  UploadModule.reset();
});

bootstrap();
