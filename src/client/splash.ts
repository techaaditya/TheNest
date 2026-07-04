import { context, requestExpandedMode } from '@devvit/web/client';

const startButton = document.getElementById('start-button') as HTMLButtonElement;
const titleElement = document.getElementById('title') as HTMLHeadingElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

titleElement.textContent = context.username
  ? `${context.username}, your Nest awaits`
  : 'The Nest awaits';
