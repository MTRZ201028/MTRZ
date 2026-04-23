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
  errCameraBlocked: "Camera access was blocked. Allow the camera in your browser settings, then try again.",
  errCameraInUse: "The camera is already in use by another app or tab. Close it and retry.",
  errCameraNotReadable: "The camera could not be opened. Try unplugging other USB cameras or restarting the browser.",
  errCameraOverconstrained: "This camera does not support the requested mode. Try “Switch camera” or use upload.",
  errCameraNotSupported: "Your browser does not support camera capture here. Use HTTPS or try another browser.",
  errCameraInsecure: "Camera requires a secure page. Open this site over HTTPS (or use http://localhost for testing).",
  errDecoderLoad: "QR decoder (jsQR) failed to load. Check your network and refresh the page.",
  errVideoPlay: "Video could not start. Tap “Try again” or use upload.",
  successCameraStarted: "Camera started.",
  successCameraStopped: "Camera stopped.",
  successCameraRead: "QR detected from camera.",
  errUnsupportedFile: "Unsupported file type. Use PNG, JPG, or WEBP.",
  errNoQrInImage: "No QR code found in this image.",
  successImageRead: "QR extracted from image.",
  errInputTooLong: "Input is too long. Please use 3000 characters or less.",
};

const state = { theme: "light", lastGenerated: "", toastTimer: null };
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
  toast: document.getElementById("toast"),
  startScanBtn: document.getElementById("start-scan-btn"),
  stopScanBtn: document.getElementById("stop-scan-btn"),
  scanResult: document.getElementById("scan-result"),
  openLinkBtn: document.getElementById("open-link-btn"),
  cameraLoading: document.getElementById("camera-loading"),
  cameraLoadingText: document.getElementById("camera-loading-text"),
  cameraVideo: document.getElementById("camera-video"),
  cameraCanvas: document.getElementById("camera-canvas"),
  cameraErrorPanel: document.getElementById("camera-error"),
  cameraErrorText: document.getElementById("camera-error-text"),
  retryCameraBtn: document.getElementById("retry-camera-btn"),
  switchCameraBtn: document.getElementById("switch-camera-btn"),
  cameraFallbackHint: document.getElementById("camera-fallback-hint"),
  qrFile: document.getElementById("qr-file"),
  uploadTriggerBtn: document.getElementById("upload-trigger-btn"),
  fileName: document.getElementById("file-name"),
  uploadPreview: document.getElementById("upload-preview"),
  uploadResult: document.getElementById("upload-result"),
  openUploadLinkBtn: document.getElementById("open-upload-link-btn"),
  uploadLoading: document.getElementById("upload-loading"),
};

const hasGeneratorPage = Boolean(dom.qrInput && dom.generateBtn && dom.qrContainer);
const hasCameraPage = Boolean(
  dom.startScanBtn && dom.stopScanBtn && dom.scanResult && dom.cameraVideo && dom.cameraCanvas
);
const hasUploadPage = Boolean(dom.qrFile && dom.uploadTriggerBtn && dom.uploadResult);

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showToast(message, type = "success") {
  if (!dom.toast) return;
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
    if (!dom.themeToggle) return;
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
    if (!dom.qrContainer || !dom.downloadBtn) return;
    dom.qrContainer.innerHTML = "";
    state.lastGenerated = "";
    dom.downloadBtn.disabled = true;
  },
  generate(showInputError = true) {
    if (!hasGeneratorPage) return;
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
    if (!hasGeneratorPage) return;
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
    if (!hasGeneratorPage) return;
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

function isSecureCameraContext() {
  if (typeof window === "undefined") return false;
  const { protocol, hostname } = window.location;
  return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function mapCameraError(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return TEXT.errCameraBlocked;
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return TEXT.errNoCamera;
  if (name === "NotReadableError" || name === "TrackStartError") return TEXT.errCameraNotReadable;
  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return TEXT.errCameraOverconstrained;
  if (name === "NotSupportedError" || name === "TypeError") return TEXT.errCameraNotSupported;
  if (name === "SecurityError") return TEXT.errCameraInsecure;
  if (name === "AbortError") return TEXT.errCameraInUse;
  return err && err.message ? `${TEXT.errCameraStart} (${err.message})` : TEXT.errCameraStart;
}

const CameraModule = {
  state: {
    cameraActive: false,
    scanResult: "",
    rafId: null,
    lastDecodeTs: 0,
    videoInputs: [],
    preferredDeviceIndex: 0,
  },
  scanIntervalMs: 110,
  decodeMaxWidth: 720,

  setLoading(active, message) {
    if (!dom.cameraLoading) return;
    dom.cameraLoading.hidden = !active;
    if (dom.cameraLoadingText && message) dom.cameraLoadingText.textContent = message;
  },

  setUiError(message) {
    if (!dom.cameraErrorPanel || !dom.cameraErrorText) return;
    const show = Boolean(message);
    dom.cameraErrorText.textContent = message || "";
    dom.cameraErrorPanel.hidden = !show;
    if (dom.cameraFallbackHint) dom.cameraFallbackHint.hidden = !show;
  },

  clearUiError() {
    this.setUiError("");
  },

  setResult(text, toastOnSuccess = true) {
    if (!dom.scanResult || !dom.openLinkBtn) return;
    const next = text || "";
    const changed = next !== this.state.scanResult;
    this.state.scanResult = next;
    dom.scanResult.textContent = this.state.scanResult || TEXT.cameraDefaultResult;
    dom.openLinkBtn.disabled = !isValidHttpUrl(this.state.scanResult);
    if (toastOnSuccess && changed && this.state.scanResult) showToast(TEXT.successCameraRead);
  },

  stopDecodeLoop() {
    if (this.state.rafId != null) {
      cancelAnimationFrame(this.state.rafId);
      this.state.rafId = null;
    }
    this.state.lastDecodeTs = 0;
  },

  async refreshVideoInputs() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      this.state.videoInputs = [];
      return this.state.videoInputs;
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    this.state.videoInputs = all.filter((d) => d.kind === "videoinput");
    return this.state.videoInputs;
  },

  async getUserMediaSequence() {
    const attempts = [
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      { video: { facingMode: { ideal: "user" } }, audio: false },
      { video: true, audio: false },
    ];
    let lastErr = null;
    for (let i = 0; i < attempts.length; i += 1) {
      try {
        return await navigator.mediaDevices.getUserMedia(attempts[i]);
      } catch (err) {
        lastErr = err;
      }
    }
    await this.refreshVideoInputs();
    const devices = this.state.videoInputs;
    for (let i = 0; i < devices.length; i += 1) {
      const deviceId = devices[i].deviceId;
      if (!deviceId) continue;
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("getUserMedia failed");
  },

  async getStreamForDeviceIndex(index) {
    await this.refreshVideoInputs();
    const devices = this.state.videoInputs;
    if (!devices.length) throw new DOMException("No camera", "NotFoundError");
    const pick = devices[Math.max(0, index) % devices.length];
    if (!pick.deviceId) {
      return this.getUserMediaSequence();
    }
    return navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: pick.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  },

  detachStream() {
    const video = dom.cameraVideo;
    this.stopDecodeLoop();
    if (video && video.srcObject) {
      const ms = video.srcObject;
      ms.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  },

  async attachAndPlay(stream) {
    const video = dom.cameraVideo;
    if (!video) return;
    this.detachStream();
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    if (typeof video.play === "function") {
      try {
        await video.play();
      } catch {
        throw new Error(TEXT.errVideoPlay);
      }
    }
  },

  startDecodeLoop() {
    const video = dom.cameraVideo;
    const canvas = dom.cameraCanvas;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const tick = (ts) => {
      if (!this.state.cameraActive) return;
      this.state.rafId = requestAnimationFrame(tick);
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (ts - this.state.lastDecodeTs < this.scanIntervalMs) return;
      this.state.lastDecodeTs = ts;
      if (!window.jsQR) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      const scale = Math.min(1, this.decodeMaxWidth / vw);
      const cw = Math.max(1, Math.floor(vw * scale));
      const ch = Math.max(1, Math.floor(vh * scale));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.drawImage(video, 0, 0, cw, ch);
      let decoded = null;
      try {
        const imageData = ctx.getImageData(0, 0, cw, ch);
        decoded = window.jsQR(imageData.data, cw, ch, { inversionAttempts: "attemptBoth" });
      } catch {
        return;
      }
      if (decoded?.data) {
        this.setResult(decoded.data, true);
      }
    };
    this.state.rafId = requestAnimationFrame(tick);
  },

  updateSwitchButton() {
    if (!dom.switchCameraBtn) return;
    const n = this.state.videoInputs.length;
    dom.switchCameraBtn.disabled = !this.state.cameraActive || n < 2;
  },

  syncCurrentDeviceIndexFromTrack() {
    const video = dom.cameraVideo;
    const track = video?.srcObject?.getVideoTracks?.()?.[0];
    const id = track?.getSettings?.()?.deviceId;
    if (!id) return;
    const idx = this.state.videoInputs.findIndex((d) => d.deviceId === id);
    if (idx >= 0) this.state.preferredDeviceIndex = idx;
  },

  async start() {
    if (!hasCameraPage) return;
    if (this.state.cameraActive) return;
    if (!isSecureCameraContext()) {
      const msg = TEXT.errCameraInsecure;
      this.setResult("", false);
      this.setUiError(msg);
      showToast(msg, "error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = TEXT.errCameraNotSupported;
      this.setResult("", false);
      this.setUiError(msg);
      showToast(msg, "error");
      return;
    }
    if (!window.jsQR) {
      const msg = TEXT.errDecoderLoad;
      this.setResult("", false);
      this.setUiError(msg);
      showToast(msg, "error");
      return;
    }

    this.clearUiError();
    this.setLoading(true, "Opening camera…");
    try {
      const stream = await this.getUserMediaSequence();
      await this.attachAndPlay(stream);
      await this.refreshVideoInputs();
      this.syncCurrentDeviceIndexFromTrack();
      this.state.cameraActive = true;
      dom.startScanBtn.disabled = true;
      dom.stopScanBtn.disabled = false;
      this.updateSwitchButton();
      this.startDecodeLoop();
      showToast(TEXT.successCameraStarted);
    } catch (err) {
      this.detachStream();
      const msg = mapCameraError(err);
      this.setResult("", false);
      this.setUiError(msg);
      showToast(msg, "error");
    } finally {
      this.setLoading(false);
    }
  },

  async switchCamera() {
    if (!hasCameraPage || !this.state.cameraActive) return;
    if (this.state.videoInputs.length < 2) return;
    this.state.preferredDeviceIndex = (this.state.preferredDeviceIndex + 1) % this.state.videoInputs.length;
    this.setLoading(true, "Switching camera…");
    try {
      this.clearUiError();
      const stream = await this.getStreamForDeviceIndex(this.state.preferredDeviceIndex);
      await this.attachAndPlay(stream);
      await this.refreshVideoInputs();
      this.syncCurrentDeviceIndexFromTrack();
      this.startDecodeLoop();
    } catch (err) {
      const msg = mapCameraError(err);
      this.setUiError(msg);
      showToast(msg, "error");
      await this.stop({ silent: true });
    } finally {
      this.setLoading(false);
    }
  },

  async stop(options = {}) {
    const { silent = false } = options;
    if (!hasCameraPage) return;
    if (!this.state.cameraActive && !dom.cameraVideo?.srcObject) {
      dom.startScanBtn.disabled = false;
      dom.stopScanBtn.disabled = true;
      this.updateSwitchButton();
      return;
    }
    try {
      this.detachStream();
    } catch {
      // no-op
    } finally {
      this.state.cameraActive = false;
      dom.startScanBtn.disabled = false;
      dom.stopScanBtn.disabled = true;
      this.updateSwitchButton();
      if (!silent) showToast(TEXT.successCameraStopped);
    }
  },

  async reset() {
    if (!hasCameraPage) return;
    await this.stop({ silent: true });
    this.state.scanResult = "";
    this.setResult(TEXT.cameraDefaultResult, false);
    this.clearUiError();
    this.setLoading(false);
    if (dom.cameraFallbackHint) dom.cameraFallbackHint.hidden = true;
  },

  init() {
    if (!hasCameraPage) return;
    dom.startScanBtn.addEventListener("click", () => this.start());
    dom.stopScanBtn.addEventListener("click", () => this.stop({ silent: false }));
    if (dom.retryCameraBtn) {
      dom.retryCameraBtn.addEventListener("click", () => {
        this.clearUiError();
        void this.start();
      });
    }
    if (dom.switchCameraBtn) {
      dom.switchCameraBtn.addEventListener("click", () => void this.switchCamera());
    }
    dom.openLinkBtn.addEventListener("click", () => {
      if (isValidHttpUrl(this.state.scanResult)) {
        window.open(this.state.scanResult, "_blank", "noopener,noreferrer");
      }
    });
    dom.startScanBtn.disabled = false;
    dom.stopScanBtn.disabled = true;
    this.updateSwitchButton();
    this.setResult(TEXT.cameraDefaultResult, false);
    this.setLoading(false);
    this.clearUiError();
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
    if (!dom.uploadLoading) return;
    dom.uploadLoading.hidden = !active;
  },
  setResult(text, toastOnSuccess = true) {
    if (!dom.uploadResult || !dom.openUploadLinkBtn) return;
    this.state.qrResult = text || "";
    dom.uploadResult.textContent = this.state.qrResult || TEXT.uploadDefaultResult;
    dom.openUploadLinkBtn.disabled = !isValidHttpUrl(this.state.qrResult);
    if (toastOnSuccess && this.state.qrResult) showToast(TEXT.successImageRead);
  },
  setPreview(file) {
    if (!dom.uploadPreview) return;
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
    if (!hasUploadPage) return;
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
    if (!hasUploadPage) return;
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
    if (!hasUploadPage) return;
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

async function bootstrap() {
  ThemeModule.init();
  GeneratorModule.init();
  CameraModule.init();
  UploadModule.init();
}

window.addEventListener("beforeunload", async () => {
  await CameraModule.reset();
  UploadModule.reset();
});

bootstrap();
