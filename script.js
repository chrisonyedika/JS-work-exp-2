let expression = "";
let justCalculated = false;
let memoryValue = 0;
const display = document.getElementById("display");
const displayValue = document.getElementById("display-value");
const memoryIndicator = document.getElementById("memory-indicator");
const historyList = document.getElementById("history-list");

function formatResult(value) {
  if (!Number.isFinite(value)) {
    return "Error";
  }
  return String(Number(value.toPrecision(12)));
}

function parseExpression(input) {
  let position = 0;

  function skipSpaces() {
    while (input[position] === " ") {
      position += 1;
    }
  }

  function parsePrimary() {
    skipSpaces();

    if (input[position] === "(") {
      position += 1;
      const value = parseAdditive();
      skipSpaces();
      if (input[position] !== ")") {
        throw new Error("Missing closing parenthesis");
      }
      position += 1;
      return value;
    }

    const number = input.slice(position).match(/^\d*\.?\d+/);
    if (!number) {
      throw new Error("Invalid expression");
    }
    position += number[0].length;
    return Number(number[0]);
  }

  function parseUnary() {
    skipSpaces();
    if (input[position] === "+") {
      position += 1;
      return parseUnary();
    }
    if (input[position] === "-") {
      position += 1;
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parseMultiplicative() {
    let value = parseUnary();
    while (true) {
      skipSpaces();
      const operator = input[position];
      if (operator !== "*" && operator !== "/") {
        return value;
      }
      position += 1;
      const nextValue = parseUnary();
      if (operator === "/" && nextValue === 0) {
        throw new Error("Division by zero");
      }
      value = operator === "*" ? value * nextValue : value / nextValue;
    }
  }

  function parseAdditive() {
    let value = parseMultiplicative();
    while (true) {
      skipSpaces();
      const operator = input[position];
      if (operator !== "+" && operator !== "-") {
        return value;
      }
      position += 1;
      const nextValue = parseMultiplicative();
      value = operator === "+" ? value + nextValue : value - nextValue;
    }
  }

  const result = parseAdditive();
  skipSpaces();
  if (position !== input.length) {
    throw new Error("Invalid expression");
  }
  return result;
}

function evaluateCurrentExpression() {
  if (!expression) {
    return 0;
  }
  return parseExpression(expression);
}

function getCurrentNumber() {
  const number = expression.match(/-?\d*\.?\d+$/)?.[0];
  return number === undefined ? null : Number(number);
}

function updateDisplay() {
  displayValue.textContent = expression || "0";
  memoryIndicator.hidden = memoryValue === 0;
}

function addToHistory(expressionText, result) {
  const item = document.createElement("li");
  item.textContent = `${expressionText} = ${result}`;
  historyList.prepend(item);

  const savedHistory = JSON.parse(
    localStorage.getItem("calculatorHistory") || "[]",
  );
  savedHistory.unshift({ expression: expressionText, result });
  localStorage.setItem(
    "calculatorHistory",
    JSON.stringify(savedHistory.slice(0, 20)),
  );
}

function loadHistory() {
  const savedHistory = JSON.parse(
    localStorage.getItem("calculatorHistory") || "[]",
  );
  savedHistory.forEach(({ expression: expressionText, result }) => {
    const item = document.createElement("li");
    item.textContent = `${expressionText} = ${result}`;
    historyList.append(item);
  });
}

document.querySelector("#history-clear").addEventListener("click", () => {
  historyList.replaceChildren();
  localStorage.removeItem("calculatorHistory");
});

function appendNumber(number) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }
  expression += number;
  updateDisplay();
}

function appendOperator(operator) {
  justCalculated = false;
  if (!expression) {
    expression = "0";
  }
  const trimmedExpression = expression.trimEnd();
  if (/[+\-*/]$/.test(trimmedExpression)) {
    expression = trimmedExpression.slice(0, -1).trimEnd();
  }
  expression += ` ${operator} `;
  updateDisplay();
}

function appendParenthesis(parenthesis) {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }

  const lastCharacter = expression.trim().slice(-1);
  if (parenthesis === "(" && /[0-9)]/.test(lastCharacter)) {
    expression += " * ";
  }
  if (parenthesis === ")") {
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    if (
      !openCount ||
      openCount <= closeCount ||
      !lastCharacter ||
      /[+\-*/(]/.test(lastCharacter)
    ) {
      return;
    }
  }
  expression += parenthesis;
  updateDisplay();
}

document.querySelectorAll(".number").forEach((button) => {
  button.addEventListener("click", () => appendNumber(button.dataset.number));
});

document.querySelector(".decimal").addEventListener("click", () => {
  if (justCalculated) {
    expression = "";
    justCalculated = false;
  }
  const currentNumber =
    expression.match(/(?:^|[+\-*/( ])(\d*\.?\d*)$/)?.[1] ?? "";
  if (!currentNumber.includes(".")) {
    expression += currentNumber ? "." : "0.";
    updateDisplay();
  }
});

document.querySelectorAll(".operator").forEach((button) => {
  button.addEventListener("click", () =>
    appendOperator(button.dataset.operator),
  );
});

document.querySelectorAll(".parenthesis").forEach((button) => {
  button.addEventListener("click", () =>
    appendParenthesis(button.dataset.parenthesis),
  );
});

document.querySelector(".equals").addEventListener("click", () => {
  if (!expression) {
    return;
  }
  try {
    const expressionText = expression;
    const result = formatResult(evaluateCurrentExpression());
    expression = result;
    justCalculated = true;
    addToHistory(expressionText, result);
    updateDisplay();
  } catch (error) {
    expression = error.message;
    justCalculated = true;
    updateDisplay();
  }
});

document.querySelector("#clear").addEventListener("click", () => {
  expression = "";
  justCalculated = false;
  updateDisplay();
});

document.querySelector("#delete").addEventListener("click", () => {
  if (justCalculated || expression.startsWith("Error")) {
    expression = "";
    justCalculated = false;
  } else {
    expression = expression.trimEnd().slice(0, -1).trimEnd();
  }
  updateDisplay();
});

document.querySelector("#percent").addEventListener("click", () => {
  if (!expression || justCalculated) {
    return;
  }
  const number = expression.match(/\d*\.?\d+$/)?.[0];
  if (number) {
    expression =
      expression.slice(0, -number.length) + formatResult(Number(number) / 100);
    updateDisplay();
  }
});

document.querySelector("#sign").addEventListener("click", () => {
  if (!expression || justCalculated) {
    return;
  }
  const number = expression.match(/\d*\.?\d+$/)?.[0];
  if (number) {
    const start = expression.length - number.length;
    expression = `${expression.slice(0, start)}-${number}`;
    updateDisplay();
  }
});

document.querySelector("#memory-clear").addEventListener("click", () => {
  memoryValue = 0;
  updateDisplay();
});

document.querySelector("#memory-recall").addEventListener("click", () => {
  const recalledValue = formatResult(memoryValue);
  if (justCalculated || !expression) {
    expression = recalledValue;
    justCalculated = false;
  } else if (/[+\-*/(]\s*$/.test(expression)) {
    expression += recalledValue;
  } else {
    const currentNumber = expression.match(/\d*\.?\d+$/)?.[0];
    expression = currentNumber
      ? expression.slice(0, -currentNumber.length) + recalledValue
      : recalledValue;
  }
  updateDisplay();
});

document.querySelector("#memory-add").addEventListener("click", () => {
  const currentNumber = getCurrentNumber();
  if (currentNumber !== null) {
    memoryValue += currentNumber;
    updateDisplay();
  }
});

document.querySelector("#memory-subtract").addEventListener("click", () => {
  const currentNumber = getCurrentNumber();
  if (currentNumber !== null) {
    memoryValue -= currentNumber;
    updateDisplay();
  }
});

loadHistory();

document.addEventListener("keydown", (event) => {
  const key = event.key;
  let button = null;

  if (/^[0-9]$/.test(key)) {
    button = document.querySelector(`[data-number="${key}"]`);
  } else if (key === "." || key === ",") {
    button = document.querySelector(".decimal");
  } else if (["+", "-", "*", "/"].includes(key)) {
    button = document.querySelector(`[data-operator="${key}"]`);
  } else if (key === "(" || key === ")") {
    button = document.querySelector(`[data-parenthesis="${key}"]`);
  } else if (key === "Enter" || key === "=") {
    button = document.querySelector(".equals");
  } else if (key === "Backspace") {
    button = document.querySelector("#delete");
  } else if (key === "Escape") {
    button = document.querySelector("#clear");
  } else if (key === "%") {
    button = document.querySelector("#percent");
  } else if (key.toLowerCase() === "n") {
    button = document.querySelector("#sign");
  } else if (key.toLowerCase() === "r") {
    button = document.querySelector("#memory-recall");
  } else if (key.toLowerCase() === "m") {
    button = document.querySelector("#memory-clear");
  }

  if (button) {
    event.preventDefault();
    button.click();
  }
});

updateDisplay();
