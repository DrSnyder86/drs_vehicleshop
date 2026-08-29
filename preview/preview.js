"use strict";

(() => {
  const fixtures = window.DRSVehicleShopPreviewFixtures?.shops;
  if (!fixtures) throw new Error("Preview fixtures failed to load.");

  const resourceName = "drs_vehicleshop_preview";
  const nuiPrefix = `https://${resourceName}/`;
  const recentStoragePrefix = "drs_vehicleshop:recent:v1:";
  const defaultCssOverrides = `:root {
  --status-accent: #ffffff;
  --success: #4effa7;
  --danger: #ff4e62;
  --radius: 10px;
  --radius-lg: 14px;
}`;
  const backgroundPreviewCss = `
html[data-drs-preview-background="city"],
html[data-drs-preview-background="city"] body {
  background:
    linear-gradient(180deg, rgba(13, 16, 26, 0.1), rgba(5, 7, 11, 0.74)),
    radial-gradient(circle at 73% 20%, rgba(255, 125, 75, 0.26), transparent 18%),
    radial-gradient(circle at 28% 18%, rgba(58, 96, 170, 0.34), transparent 24%),
    linear-gradient(145deg, #283347 0%, #151c29 36%, #16151c 66%, #090b0f 100%) !important;
}

html[data-drs-preview-background="dark"],
html[data-drs-preview-background="dark"] body {
  background:
    radial-gradient(circle at 50% 30%, #282c35 0%, #101217 38%, #08090c 80%),
    #08090c !important;
}

html[data-drs-preview-background="light"],
html[data-drs-preview-background="light"] body {
  background:
    radial-gradient(circle at 55% 25%, rgba(255, 255, 255, 0.96), transparent 36%),
    linear-gradient(145deg, #b8c2cf, #768392 58%, #4b5460) !important;
}

html[data-drs-preview-background="checker"],
html[data-drs-preview-background="checker"] body {
  background-color: #20242b !important;
  background-image:
    linear-gradient(45deg, #2b3039 25%, transparent 25%),
    linear-gradient(-45deg, #2b3039 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #2b3039 75%),
    linear-gradient(-45deg, transparent 75%, #2b3039 75%) !important;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0 !important;
  background-size: 24px 24px !important;
}`;

  const elements = {
    frame: document.getElementById("nuiFrame"),
    frameShell: document.getElementById("frameShell"),
    frameLoading: document.getElementById("frameLoading"),
    stage: document.getElementById("previewStage"),
    shop: document.getElementById("shopSelect"),
    screen: document.getElementById("screenSelect"),
    vehicle: document.getElementById("vehicleSelect"),
    viewport: document.getElementById("viewportSelect"),
    zoom: document.getElementById("zoomSelect"),
    background: document.getElementById("backgroundSelect"),
    quoteResult: document.getElementById("quoteResultSelect"),
    purchaseResult: document.getElementById("purchaseResultSelect"),
    latency: document.getElementById("latencyInput"),
    latencyOutput: document.getElementById("latencyOutput"),
    timer: document.getElementById("timerInput"),
    timerOutput: document.getElementById("timerOutput"),
    zoomOutput: document.getElementById("zoomOutput"),
    viewportOutput: document.getElementById("viewportOutput"),
    css: document.getElementById("cssOverrides"),
    status: document.getElementById("statusText"),
    eventLog: document.getElementById("eventLog"),
    protocolWarning: document.getElementById("protocolWarning"),
    toggleControls: document.getElementById("toggleControlsButton"),
  };

  const state = {
    ready: false,
    initializedDocument: null,
    scenarioToken: 0,
    statusToken: 0,
    timerVisible: false,
    resizeFrame: null,
    cssTimer: null,
    events: [],
    pendingMocks: new Set(),
    quoteSequence: 0,
  };

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function pendingMockResponse() {
    return new Promise((resolve) => state.pendingMocks.add(resolve));
  }

  function cancelPendingMocks() {
    const pending = Array.from(state.pendingMocks);
    state.pendingMocks.clear();
    pending.forEach((resolve) =>
      resolve({
        ok: false,
        code: "preview_cancelled",
        message: "The preview state changed before this mock completed.",
      }),
    );
  }

  function currentFixture() {
    return fixtures[elements.shop.value] || fixtures.car;
  }

  function fixtureVehicles(fixture = currentFixture()) {
    return Object.entries(fixture.open.vehicles).flatMap(([category, entries]) =>
      Object.values(entries).map((vehicle) => ({ ...vehicle, category })),
    );
  }

  function selectedFixtureVehicle(model = elements.vehicle.value) {
    const vehicles = fixtureVehicles();
    return vehicles.find((vehicle) => vehicle.model === model) || vehicles[0] || null;
  }

  function setStatus(message) {
    elements.status.textContent = message;
  }

  function flashStatus(message) {
    const token = ++state.statusToken;
    setStatus(message);
    window.setTimeout(() => {
      if (token === state.statusToken && state.ready) {
        setStatus("Ready · interactions use local mock responses");
      }
    }, 2200);
  }

  function optionLabel(options, id, fallback) {
    return options.find((option) => option.id === id)?.label || fallback;
  }

  function optionPrice(options, id) {
    const price = Number(options.find((option) => option.id === id)?.price);
    return Number.isFinite(price) && price >= 0 ? price : 0;
  }

  function buildQuote(payload) {
    const fixture = currentFixture();
    const vehicle = selectedFixtureVehicle(payload.model);
    const checkout = fixture.open.checkout;
    const requested = payload.customization || {};
    const selection = {
      primaryColorId:
        requested.primaryColorId || checkout.defaults.primaryColorId,
      secondaryColorId:
        requested.secondaryColorId || checkout.defaults.secondaryColorId,
      plateMode: requested.plateMode || checkout.defaults.plateMode,
      platePrefix: String(requested.platePrefix || "").slice(0, 3).toUpperCase(),
      plateStyleId: requested.plateStyleId || checkout.defaults.plateStyleId,
      deliveryMode: requested.deliveryMode || checkout.defaults.deliveryMode,
    };
    const primaryPaint = optionPrice(checkout.colors, selection.primaryColorId);
    const secondaryPaint =
      selection.secondaryColorId === selection.primaryColorId
        ? 0
        : optionPrice(checkout.colors, selection.secondaryColorId);
    const paint = primaryPaint + secondaryPaint;
    const plate = selection.plateMode === "prefix" ? 7500 : 0;
    const style = optionPrice(checkout.plateStyles, selection.plateStyleId);
    const base = Number(vehicle?.price) || 0;

    return {
      id: `q_preview_${Date.now().toString(36)}_${String(++state.quoteSequence).padStart(4, "0")}`,
      expiresAt: Math.floor(Date.now() / 1000) + 120,
      model: vehicle?.model || payload.model,
      shopId: fixture.open.shop.id,
      vehicleType: fixture.open.shop.type,
      capabilities: clone(checkout.capabilities),
      options: {
        colors: clone(checkout.colors),
        primaryColors: clone(checkout.colors),
        secondaryColors: clone(checkout.colors),
        plateStyles: clone(checkout.plateStyles),
        deliveryModes: clone(checkout.deliveryModes),
        platePrefix: { minLength: 1, maxLength: 3, price: 7500 },
      },
      selection,
      labels: {
        primaryColor: optionLabel(checkout.colors, selection.primaryColorId, "Included"),
        secondaryColor: optionLabel(checkout.colors, selection.secondaryColorId, "Included"),
        plate: selection.plateMode === "prefix" ? `${selection.platePrefix || "DRS"} prefix` : "Standard issue",
        plateMode: selection.plateMode === "prefix" ? "Custom prefix" : "Standard issue",
        plateStyle: optionLabel(checkout.plateStyles, selection.plateStyleId, "San Andreas Cursive"),
        deliveryMode: optionLabel(checkout.deliveryModes, selection.deliveryMode, "Drive away"),
      },
      costs: { base, paint, plate, style, total: base + paint + plate + style },
      platePreview:
        selection.plateMode === "prefix"
          ? `${selection.platePrefix || "DRS"}••••`
          : "PENDING",
    };
  }

  function serializePayload(payload) {
    return JSON.stringify(payload || {});
  }

  function renderEventLog() {
    elements.eventLog.replaceChildren();
    if (state.events.length === 0) {
      const empty = document.createElement("li");
      empty.className = "event-empty";
      empty.textContent = "Interact with the showroom to inspect mocked NUI callbacks.";
      elements.eventLog.append(empty);
      return;
    }

    state.events.forEach((event) => {
      const item = document.createElement("li");
      const method = document.createElement("span");
      method.className = "event-method";
      method.textContent = "POST";
      const endpoint = document.createElement("code");
      endpoint.title = event.payload;
      endpoint.textContent = `${event.endpoint} ${event.payload}`;
      const time = document.createElement("time");
      time.className = "event-time";
      time.textContent = event.time;
      item.append(method, endpoint, time);
      elements.eventLog.append(item);
    });
  }

  function logCallback(endpoint, payload) {
    state.events.unshift({
      endpoint,
      payload: serializePayload(payload),
      time: new Date().toLocaleTimeString([], { hour12: false }),
    });
    state.events = state.events.slice(0, 8);
    renderEventLog();
  }

  async function mockNuiResponse(endpoint, payload) {
    switch (endpoint) {
      case "quoteVehicle":
        if (elements.quoteResult.value === "pending") return pendingMockResponse();
        await wait(Number(elements.latency.value));
        if (elements.quoteResult.value === "error") {
          return {
            ok: false,
            code: "invalid_customization",
            message: "Preview response: choose a valid factory option.",
          };
        }
        return {
          ok: true,
          code: "quoted",
          message: "Preview quote generated.",
          quote: buildQuote(payload),
        };

      case "buyVehicle":
        if (elements.purchaseResult.value === "pending") return pendingMockResponse();
        await wait(Number(elements.latency.value));
        if (elements.purchaseResult.value === "error") {
          return {
            ok: false,
            code: "insufficient_funds",
            message: "Preview response: you do not have enough cash.",
          };
        }
        if (elements.purchaseResult.value === "expired") {
          return {
            ok: false,
            code: "quote_expired",
            message: "Preview response: that checkout quote expired.",
          };
        }
        return { ok: true, code: "purchased", message: "Preview purchase complete." };

      case "testDrive":
        window.setTimeout(() => sendToUi({ action: "updateTestDriveTime", time: 120 }), 80);
        return { ok: true, code: "test_drive_started", message: "Preview timer started." };

      case "close":
        return { ok: true, code: "closed" };

      case "addVehicle":
        return { ok: true, code: "preview_submitted", message: "Preview submission accepted." };

      default:
        return {
          ok: false,
          code: "unknown_preview_endpoint",
          message: `The previewer does not mock ${endpoint}.`,
        };
    }
  }

  async function handlePreviewRequest(endpoint, payload, method) {
    if (method !== "POST") {
      return { status: 405, data: { ok: false, code: "method_not_allowed" } };
    }

    logCallback(endpoint, payload);
    const data = await mockNuiResponse(endpoint, payload);
    const supported = ["quoteVehicle", "buyVehicle", "testDrive", "close", "addVehicle"].includes(
      endpoint,
    );
    return { status: supported ? 200 : 404, data };
  }

  async function handleFrameRequest(event) {
    const request = event.data;
    if (
      event.origin !== window.location.origin ||
      event.source !== elements.frame.contentWindow ||
      request?.source !== "drs-vehicleshop-preview:request" ||
      typeof request.id !== "string"
    ) {
      return;
    }

    const requestSource = event.source;
    let result;
    try {
      result = await handlePreviewRequest(
        String(request.endpoint || ""),
        request.payload && typeof request.payload === "object" ? request.payload : {},
        String(request.method || "GET").toUpperCase(),
      );
    } catch (error) {
      result = {
        status: 500,
        data: {
          ok: false,
          code: "preview_mock_error",
          message: error?.message || "The local preview mock failed.",
        },
      };
    }

    try {
      requestSource.postMessage(
        {
          source: "drs-vehicleshop-preview:response",
          id: request.id,
          status: result.status,
          data: result.data,
        },
        window.location.origin,
      );
    } catch (_) {
      // A reloaded iframe no longer needs the response from its previous mock.
    }
  }

  function sendToUi(payload) {
    if (!state.ready) return;
    elements.frame.contentWindow.postMessage(payload, window.location.origin);
  }

  function clearRecentVehicles() {
    try {
      const storage = elements.frame.contentWindow.localStorage;
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key?.startsWith(recentStoragePrefix)) storage.removeItem(key);
      }
    } catch (_) {
      // A blocked storage origin should not prevent the preview from rendering.
    }
  }

  async function waitFor(predicate, token, timeout = 1800) {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      if (token !== state.scenarioToken) throw new Error("Preview state changed");
      const result = predicate();
      if (result) return result;
      await wait(20);
    }
    throw new Error("The real UI did not reach the requested preview state.");
  }

  function childDocument() {
    return elements.frame.contentDocument;
  }

  async function openFixture(token) {
    // Force a complete hide/open cycle so a previous visible state cannot make
    // this scenario race ahead of the real UI's asynchronous message handler.
    sendToUi({ action: "handoffStarting" });
    await waitFor(
      () => childDocument().getElementById("container")?.classList.contains("hidden"),
      token,
    );
    clearRecentVehicles();
    sendToUi(clone(currentFixture().open));
    return waitFor(
      () => !childDocument().getElementById("container")?.classList.contains("hidden"),
      token,
    );
  }

  async function selectVehicle(token) {
    const model = elements.vehicle.value;
    const card = await waitFor(
      () =>
        Array.from(childDocument().querySelectorAll(".vehicle-card")).find(
          (candidate) => candidate.dataset.model === model,
        ),
      token,
    );
    card.click();
    return waitFor(
      () => childDocument().querySelector(`.vehicle-info[data-vehicle-model="${model}"]`),
      token,
    );
  }

  async function openConfigure(token) {
    await selectVehicle(token);
    const button = await waitFor(() => childDocument().querySelector(".buy-btn"), token);
    button.click();
    return waitFor(() => childDocument().querySelector(".checkout-shell"), token);
  }

  async function requestQuote(token) {
    await openConfigure(token);
    const button = await waitFor(
      () => childDocument().querySelector(".checkout-primary-action"),
      token,
    );
    button.click();
  }

  function setRecommendedMocks(screen) {
    const recommendations = {
      "quote-loading": ["pending", "success"],
      "quote-error": ["error", "success"],
      review: ["success", "success"],
      "purchase-processing": ["success", "pending"],
      "purchase-error": ["success", "error"],
      "quote-expired": ["success", "expired"],
    };
    const values = recommendations[screen];
    if (!values) return;
    [elements.quoteResult.value, elements.purchaseResult.value] = values;
  }

  async function applyScenario({ recommendMocks = false } = {}) {
    if (!state.ready) return;
    const token = ++state.scenarioToken;
    cancelPendingMocks();
    const screen = elements.screen.value;
    if (recommendMocks) setRecommendedMocks(screen);
    setStatus(`Building ${elements.screen.selectedOptions[0].textContent.toLowerCase()}…`);

    try {
      await openFixture(token);

      switch (screen) {
        case "catalogue":
          break;

        case "detail":
          await selectVehicle(token);
          break;

        case "configure":
          await openConfigure(token);
          break;

        case "quote-loading":
          await requestQuote(token);
          await waitFor(
            () => childDocument().querySelector(".checkout-primary-action")?.textContent.includes("Building"),
            token,
          );
          break;

        case "quote-error":
          await requestQuote(token);
          await waitFor(() => childDocument().querySelector(".checkout-alert.has-message"), token, 2600);
          break;

        case "review":
        case "purchase-processing":
        case "purchase-error":
        case "quote-expired": {
          await requestQuote(token);
          await waitFor(() => childDocument().querySelector(".checkout-cost-list"), token, 2600);
          if (screen !== "review") {
            const purchase = childDocument().querySelector(".checkout-primary-action");
            purchase?.click();
            if (screen === "purchase-processing") {
              await waitFor(() => childDocument().querySelector(".vehicle-info.is-processing"), token);
            } else {
              await waitFor(() => childDocument().querySelector(".checkout-alert.has-message"), token, 2600);
            }
          }
          break;
        }

        case "empty-results": {
          const search = childDocument().getElementById("searchInput");
          search.value = "definitely-not-in-stock";
          search.dispatchEvent(new elements.frame.contentWindow.Event("input", { bubbles: true }));
          await waitFor(() => childDocument().querySelector(".empty-state"), token);
          break;
        }

        case "dealer":
          sendToUi({ action: "openDealerMenu", categories: currentFixture().open.categories });
          await waitFor(() => childDocument().querySelector(".dealer-form"), token);
          break;

        case "hidden":
          sendToUi({ action: "handoffStarting" });
          await waitFor(
            () => childDocument().getElementById("container")?.classList.contains("hidden"),
            token,
          );
          break;
      }

      if (token === state.scenarioToken) {
        setStatus("Ready · interactions use local mock responses");
      }
    } catch (error) {
      if (token !== state.scenarioToken) return;
      console.error(error);
      setStatus(error.message || "Could not build the requested state.");
    }
  }

  function populateVehicleOptions() {
    const fixture = currentFixture();
    const previous = elements.vehicle.value;
    elements.vehicle.replaceChildren();
    fixtureVehicles(fixture).forEach((vehicle) => {
      const option = document.createElement("option");
      option.value = vehicle.model;
      option.textContent = `${vehicle.brand} · ${vehicle.name}`;
      elements.vehicle.append(option);
    });
    const available = Array.from(elements.vehicle.options).some(
      (option) => option.value === previous,
    );
    elements.vehicle.value = available ? previous : fixture.defaultModel;
  }

  function viewportDimensions() {
    const [width, height] = elements.viewport.value.split("x").map(Number);
    return { width, height };
  }

  function applyViewport() {
    const { width, height } = viewportDimensions();
    const requested = elements.zoom.value;
    const horizontalFit = Math.max(0.1, (elements.stage.clientWidth - 54) / width);
    const verticalFit = Math.max(0.1, (elements.stage.clientHeight - 54) / height);
    const scale = requested === "fit" ? Math.min(1, horizontalFit, verticalFit) : Number(requested);

    elements.frame.style.width = `${width}px`;
    elements.frame.style.height = `${height}px`;
    elements.frame.style.transform = `scale(${scale})`;
    elements.frameShell.style.width = `${Math.round(width * scale)}px`;
    elements.frameShell.style.height = `${Math.round(height * scale)}px`;
    elements.viewportOutput.textContent = `${width} × ${height} CSS px`;
    elements.zoomOutput.textContent = `${Math.round(scale * 100)}%`;
  }

  function applyCssOverrides({ announce = false } = {}) {
    if (!state.ready) return;
    const doc = childDocument();
    let style = doc.getElementById("drs-previewer-css-overrides");
    if (!style) {
      style = doc.createElement("style");
      style.id = "drs-previewer-css-overrides";
      doc.head.append(style);
    }
    style.textContent = elements.css.value;
    if (announce) flashStatus("CSS overrides applied inside the real UI");
  }

  function applyBackground() {
    elements.stage.dataset.background = elements.background.value;
    if (!state.ready) return;

    const doc = childDocument();
    let style = doc.getElementById("drs-previewer-background");
    if (!style) {
      style = doc.createElement("style");
      style.id = "drs-previewer-background";
      doc.head.append(style);
    }
    style.textContent = backgroundPreviewCss;
    doc.documentElement.dataset.drsPreviewBackground = elements.background.value;
  }

  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      flashStatus(successMessage);
    } catch (_) {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
      flashStatus(successMessage);
    }
  }

  function reloadFrame() {
    state.ready = false;
    state.scenarioToken += 1;
    cancelPendingMocks();
    state.initializedDocument = null;
    elements.frameLoading.hidden = false;
    elements.frameLoading.classList.remove("is-ready");
    setStatus("Reloading the production UI…");
    elements.frame.src = `../html/index.html?previewReload=${Date.now()}`;
  }

  async function initializeFrame() {
    if (!/^https?:$/.test(window.location.protocol)) return;
    const child = elements.frame.contentWindow;
    const doc = elements.frame.contentDocument;
    if (!child || !doc?.head || state.initializedDocument === doc) return;

    state.initializedDocument = doc;
    // Build the fetch shim inside the iframe's own JavaScript realm. This keeps
    // Response-like objects compatible with the production UI while routing only
    // this preview resource's NUI callbacks through same-origin postMessage.
    const bridgeScript = doc.createElement("script");
    bridgeScript.dataset.drsPreviewBridge = "true";
    bridgeScript.textContent = `(() => {
      const resourceName = ${JSON.stringify(resourceName)};
      const nuiPrefix = ${JSON.stringify(nuiPrefix)};
      const nativeFetch = window.fetch.bind(window);
      const pendingRequests = new Map();
      let requestSequence = 0;

      window.GetParentResourceName = () => resourceName;
      window.addEventListener("message", (event) => {
        const response = event.data;
        if (
          event.origin !== window.location.origin ||
          event.source !== window.parent ||
          response?.source !== "drs-vehicleshop-preview:response"
        ) {
          return;
        }

        const resolve = pendingRequests.get(response.id);
        if (!resolve) return;
        pendingRequests.delete(response.id);
        resolve({
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          json: async () => response.data,
        });
      });

      window.fetch = async (input, options = {}) => {
        const url = typeof input === "string" ? input : input?.url || "";
        if (!url.startsWith(nuiPrefix)) return nativeFetch(input, options);

        const endpoint = decodeURIComponent(url.slice(nuiPrefix.length)).split(/[?#]/, 1)[0];
        const method = String(options.method || "GET").toUpperCase();
        let payload = {};
        if (options.body) {
          try {
            payload = JSON.parse(String(options.body));
          } catch (_) {
            payload = {};
          }
        }

        const id = String(Date.now()) + ":" + String(++requestSequence);
        return new Promise((resolve) => {
          pendingRequests.set(id, resolve);
          window.parent.postMessage(
            {
              source: "drs-vehicleshop-preview:request",
              id,
              endpoint,
              method,
              payload,
            },
            window.location.origin,
          );
        });
      };
    })();`;
    doc.head.append(bridgeScript);
    bridgeScript.remove();
    state.ready = true;
    elements.frameLoading.classList.add("is-ready");
    elements.frameLoading.hidden = true;
    populateVehicleOptions();
    applyViewport();
    applyBackground();
    applyCssOverrides();
    await applyScenario();
  }

  function bindControls() {
    window.addEventListener("message", handleFrameRequest);
    elements.shop.addEventListener("change", () => {
      populateVehicleOptions();
      applyScenario();
    });
    elements.screen.addEventListener("change", () => applyScenario({ recommendMocks: true }));
    elements.vehicle.addEventListener("change", () => applyScenario());
    elements.quoteResult.addEventListener("change", () => {
      flashStatus(`Quote mock set to ${elements.quoteResult.selectedOptions[0].textContent.toLowerCase()}`);
    });
    elements.purchaseResult.addEventListener("change", () => {
      flashStatus(`Purchase mock set to ${elements.purchaseResult.selectedOptions[0].textContent.toLowerCase()}`);
    });
    elements.viewport.addEventListener("change", applyViewport);
    elements.zoom.addEventListener("change", applyViewport);
    elements.background.addEventListener("change", applyBackground);
    elements.latency.addEventListener("input", () => {
      elements.latencyOutput.value = `${elements.latency.value} ms`;
    });
    elements.timer.addEventListener("input", () => {
      elements.timerOutput.value = `${elements.timer.value} s`;
      if (state.timerVisible) {
        sendToUi({ action: "updateTestDriveTime", time: Number(elements.timer.value) });
      }
    });

    document.getElementById("showTimerButton").addEventListener("click", () => {
      state.timerVisible = true;
      sendToUi({ action: "updateTestDriveTime", time: Number(elements.timer.value) });
      flashStatus("Test-drive timer overlay shown");
    });
    document.getElementById("endTimerButton").addEventListener("click", () => {
      state.timerVisible = false;
      sendToUi({ action: "testDriveEnded" });
      flashStatus("Test-drive timer ended");
    });
    document.getElementById("reopenButton").addEventListener("click", () => applyScenario());
    document.getElementById("reloadButton").addEventListener("click", reloadFrame);
    document.getElementById("applyCssButton").addEventListener("click", () =>
      applyCssOverrides({ announce: true }),
    );
    document.getElementById("copyCssButton").addEventListener("click", () =>
      copyText(elements.css.value, "CSS overrides copied"),
    );
    document.getElementById("resetCssButton").addEventListener("click", () => {
      elements.css.value = defaultCssOverrides;
      applyCssOverrides({ announce: true });
    });
    elements.css.addEventListener("input", () => {
      window.clearTimeout(state.cssTimer);
      state.cssTimer = window.setTimeout(applyCssOverrides, 180);
    });
    document.getElementById("clearLogButton").addEventListener("click", () => {
      state.events = [];
      renderEventLog();
    });
    document.getElementById("copyPayloadButton").addEventListener("click", () =>
      copyText(JSON.stringify(currentFixture().open, null, 2), "Open payload copied"),
    );
    elements.toggleControls.addEventListener("click", () => {
      const hidden = document.body.classList.toggle("controls-hidden");
      elements.toggleControls.setAttribute("aria-pressed", String(hidden));
      elements.toggleControls.textContent = hidden ? "Show controls" : "Hide controls";
      window.requestAnimationFrame(applyViewport);
    });

    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(state.resizeFrame);
      state.resizeFrame = window.requestAnimationFrame(applyViewport);
    });
  }

  function start() {
    bindControls();
    renderEventLog();
    elements.css.value = defaultCssOverrides;
    elements.latencyOutput.value = `${elements.latency.value} ms`;
    elements.timerOutput.value = `${elements.timer.value} s`;
    elements.protocolWarning.hidden = /^https?:$/.test(window.location.protocol);
    if (!elements.protocolWarning.hidden) {
      setStatus("Local server required for safe same-origin NUI mocking");
      return;
    }

    elements.frame.addEventListener("load", initializeFrame);
    if (elements.frame.contentDocument?.readyState === "complete") {
      window.setTimeout(initializeFrame, 0);
    }
  }

  start();
})();
