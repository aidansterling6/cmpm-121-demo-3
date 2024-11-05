const app = document.querySelector<HTMLDivElement>("#app")!;
interface Button {
  type: string;
  innerHTML: string | null;
  ClickFunction: (event: MouseEvent) => void;
}

AddHTMLButton({
  type: "button",
  innerHTML: "test",
  ClickFunction: () => {
    alert("you clicked the button!");
  },
});

function AddHTMLElement(
  type: string,
  innerHTML: string | null = null,
): HTMLElement {
  const tmp = document.createElement(type);
  app.append(tmp);
  if (innerHTML !== null) {
    tmp.innerHTML = innerHTML;
  }
  return tmp;
}
function AddHTMLButton(button: Button): HTMLElement {
  const tmp = AddHTMLElement(button.type, button.innerHTML);
  tmp.addEventListener("click", button.ClickFunction);
  return tmp;
}
