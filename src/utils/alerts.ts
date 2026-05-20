export function showCustomAlert(message: string, imagePath?: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!document.getElementById("poppins-font-style")) {
      const fontStyle = document.createElement("style");
      fontStyle.id = "poppins-font-style";
      fontStyle.textContent = `
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-Regular.woff2")}") format("woff2");
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-SemiBold.woff2")}") format("woff2");
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-Black.woff2")}") format("woff2");
          font-weight: 900;
          font-style: normal;
        }
        
        @keyframes sr-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sr-modal-slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(fontStyle);
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 11, 14, 0.75);
      backdrop-filter: blur(12px);
      font-family: "Poppins", system-ui, sans-serif;
      animation: sr-modal-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: linear-gradient(145deg, #1a1c23, #111218);
      color: #f3f4f6;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(226, 183, 20, 0.1);
      max-width: 440px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      animation: sr-modal-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    if (imagePath) {
      const img = document.createElement("img");
      img.src = chrome.runtime.getURL(imagePath);
      img.style.cssText = `
        width: 80%;
        height: auto;
        border-radius: 10px;
        display: block;
      `;
      dialog.appendChild(img);
    }

    const text = document.createElement("div");
    text.textContent = message;
    text.style.cssText = `
      font-family: "Poppins", system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      font-weight: 500;
      color: #e5e7eb;
      margin: 0;
      padding: 0 8px;
      letter-spacing: 0.2px;
      ${message.includes("\\n") ? "white-space: pre-line;" : ""}
    `;
    dialog.appendChild(text);

    const button = document.createElement("button");
    button.textContent = "OK";
    button.style.cssText = `
      font-family: "Poppins", system-ui, sans-serif;
      padding: 10px 48px;
      background: linear-gradient(135deg, #ffd03b 0%, #e2b714 100%);
      color: #0b0f16;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(226, 183, 20, 0.3);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
    `;
    button.onmouseover = () => {
      button.style.transform = "scale(1.04)";
      button.style.boxShadow = "0 12px 24px rgba(226, 183, 20, 0.45)";
      button.style.filter = "brightness(1.05)";
    };
    button.onmouseout = () => {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "0 8px 20px rgba(226, 183, 20, 0.3)";
      button.style.filter = "none";
    };
    button.onclick = () => {
      overlay.remove();
      resolve();
    };
    dialog.appendChild(button);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}

export function showCustomConfirm(message: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!document.getElementById("poppins-font-style")) {
      const fontStyle = document.createElement("style");
      fontStyle.id = "poppins-font-style";
      fontStyle.textContent = `
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-Regular.woff2")}") format("woff2");
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-SemiBold.woff2")}") format("woff2");
          font-weight: 600;
          font-style: normal;
        }
        @font-face {
          font-family: "Poppins";
          src: url("${chrome.runtime.getURL("assets/fonts/Poppins-Black.woff2")}") format("woff2");
          font-weight: 900;
          font-style: normal;
        }
        
        @keyframes sr-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sr-modal-slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `;
      document.head.appendChild(fontStyle);
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 11, 14, 0.75);
      backdrop-filter: blur(12px);
      font-family: "Poppins", system-ui, sans-serif;
      animation: sr-modal-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: linear-gradient(145deg, #1a1c23, #111218);
      color: #f3f4f6;
      padding: 32px;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(226, 183, 20, 0.1);
      max-width: 440px;
      width: 90%;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      animation: sr-modal-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    `;

    const text = document.createElement("div");
    text.style.cssText = `
      font-family: "Poppins", system-ui, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      font-weight: 500;
      color: #e5e7eb;
      margin: 0;
      padding: 0 8px;
      letter-spacing: 0.2px;
      white-space: pre-line;
    `;
    text.textContent = message;
    dialog.appendChild(text);

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText = `
      display: flex;
      gap: 16px;
      width: 100%;
      justify-content: center;
    `;

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = `
      font-family: "Poppins", system-ui, sans-serif;
      padding: 10px 32px;
      background: rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      font-weight: 600;
      font-size: 13.5px;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.transform = "scale(1.04)";
      cancelBtn.style.background = "rgba(255, 255, 255, 0.15)";
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.transform = "scale(1)";
      cancelBtn.style.background = "rgba(255, 255, 255, 0.08)";
    };
    cancelBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };

    const okBtn = document.createElement("button");
    okBtn.textContent = "OK";
    okBtn.style.cssText = `
      font-family: "Poppins", system-ui, sans-serif;
      padding: 10px 32px;
      background: linear-gradient(135deg, #ffd03b 0%, #e2b714 100%);
      color: #0b0f16;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13.5px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(226, 183, 20, 0.3);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
    `;
    okBtn.onmouseover = () => {
      okBtn.style.transform = "scale(1.04)";
      okBtn.style.boxShadow = "0 12px 24px rgba(226, 183, 20, 0.45)";
      okBtn.style.filter = "brightness(1.05)";
    };
    okBtn.onmouseout = () => {
      okBtn.style.transform = "scale(1)";
      okBtn.style.boxShadow = "0 8px 20px rgba(226, 183, 20, 0.3)";
      okBtn.style.filter = "none";
    };
    okBtn.onclick = () => {
      overlay.remove();
      resolve(true);
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(okBtn);
    dialog.appendChild(btnContainer);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  });
}
