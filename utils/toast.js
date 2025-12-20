export function showToast(message) {
  Toastify({
    text: message,
    className: "toast",
    duration: 3000,
    gravity: "top",
    position: "center",
    stopOnFocus: true,
    escapeMarkup: false,
    offset: {
      y: -14,
    },
  }).showToast();
}
