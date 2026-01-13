export function showToast(message, type = "info") {
  const bgColors = {
    info: "#E8E2D2",
    success: "#D7FBC1",
    warning: "#FCDCC1",
    error: "#F38F79",
  };
  Toastify({
    text: message,
    className: "toast",
    duration: 4000,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    escapeMarkup: false,
    offset: {
      y: -14,
    },
    style: {
      background: bgColors[type] || bgColors.info,
      maxWidth: "none",
      width: "100vw",
    },
  }).showToast();
}
