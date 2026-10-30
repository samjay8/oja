/**
 * Builds the Oja interview Google Form (content: docs/research/interview-form.md).
 *
 * How to run:
 *   1. Go to https://script.google.com -> New project. Delete the sample code, paste this file.
 *   2. Set CONTACT_EMAIL below (shown to respondents for deletion requests).
 *   3. Select createInterviewForm in the toolbar -> Run -> approve the permissions prompt.
 *   4. Open the Execution log: it prints the share link, the edit link and the responses Sheet link.
 * Running it again creates a NEW form; it never edits an existing one.
 */
const CONTACT_EMAIL = 'YOUR_EMAIL_HERE';

const CATEGORIES = [
  'Clothing & fashion', 'Aso-ebi & fabrics', 'Tailoring / made-to-measure',
  'Shoes, bags & leather', 'Beauty, hair & cosmetics', 'Crafts, art & beads',
  'Food & groceries', 'Electronics & gadgets',
];
const CHANNELS = [
  'WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'My own website',
  'Online marketplace (e.g. Jiji, Jumia, Etsy)', 'Physical shop or market',
  'Phone calls', 'Referrals / word of mouth',
];
const SHARE_RANGES = [
  'None', 'A few (under 10%)', 'Some (10–25%)', 'Many (25–50%)', 'Most (over 50%)', 'Not sure',
];

function createInterviewForm() {
  if (CONTACT_EMAIL === 'YOUR_EMAIL_HERE') {
    throw new Error('Set CONTACT_EMAIL at the top of the script before running.');
  }

  const form = FormApp.create('🚀 Help Us Build the Future of Social Commerce');
  form.setDescription(
    "We're building a tool for people who buy and sell through WhatsApp, Instagram, Facebook " +
    'and other online chats, and we want to get it right. Please tell us about things that ' +
    'actually happened to you, not what you think might happen. There are no right or wrong answers.\n\n' +
    '⏱ About 6–8 minutes. Most questions are quick taps; story answers can be one sentence.\n\n' +
    'Privacy: we only use your answers to understand how people buy and sell online and to shape ' +
    "what we build. We don't sell your data. Contact details are optional. We may share anonymous " +
    "summaries in a hackathon project submission, and we'll only quote you if you say yes at the end. " +
    'To have your answers deleted, email ' + CONTACT_EMAIL + '.'
  );
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Thank you! Your story helps us build something that actually works for buyers and sellers. 🙏'
  );

  // Page 1: About you
  const role = form.addMultipleChoiceItem().setTitle('Which describes you?').setRequired(true);
  text_(form, 'Which country do you live in?', { required: true });
  text_(form, 'Which city or state?');

  // Page 2: Sellers
  const sellerPage = form.addPageBreakItem()
    .setTitle('For sellers')
    .setHelpText('Fashion, aso-ebi, tailoring, crafts, or anything else you sell. ' +
      'Tell us about the hustle behind the scenes.');
  checkbox_(form, 'What do you sell?', CATEGORIES, { required: true, other: true });
  checkbox_(form, 'Where do customers reach you?', CHANNELS, { required: true, other: true });
  choice_(form, 'Which ONE brings you the most sales?', CHANNELS, { required: true, other: true });
  choice_(form, 'About how many orders do you get in a typical month?',
    ['1–10', '11–30', '31–100', 'More than 100'], { required: true });
  paragraph_(form, 'The "Just Sold It" Story: Think of your last 3 sales. Where did each customer find you, and how did they pay?',
    { help: 'e.g. "Instagram DM, paid by bank transfer."' });
  choice_(form, 'Beyond City Borders: Last month, roughly how many of your buyers were outside your city?',
    SHARE_RANGES, { required: true });
  choice_(form, '…and outside your country?', SHARE_RANGES, { required: true });
  checkbox_(form, 'Which payment methods do you accept?', [
    'Bank transfer', 'Mobile money / wallet (OPay, Moniepoint, PalmPay, etc.)', 'POS / card in person',
    'Payment link (Paystack, Flutterwave, Selar, etc.)', 'Pay on delivery / cash', 'PayPal',
    'Money-transfer apps (Wise, LemFi, etc.)', 'Payoneer or Grey', 'Crypto / USDT',
  ], { required: true, other: true });
  choice_(form, 'Do you have a PayPal account?', [
    'No', 'I had one but stopped using it', 'Yes, and I receive payments with it',
    "Yes, but I don't use it to receive payments", 'Not sure',
  ], { required: true });
  choice_(form, 'If you live in Nigeria: have you linked PayPal to Paga to receive money?',
    ['Yes', 'No', "I didn't know that was possible", "I don't live in Nigeria"]);
  paragraph_(form, 'The One That Got Away: Tell us about the last time a potential sale slipped away. What exactly happened?',
    { required: true });
  checkbox_(form, 'What most often makes you lose sales? Pick up to 3.', [
    'I replied too late', "We couldn't agree on price", "The buyer didn't like my payment method",
    "The buyer didn't trust me enough to pay", 'Delivery cost or time', 'Out of stock',
    'Size or measurement issues', 'The buyer just stopped replying',
  ], { required: true, other: true, maxPicks: 3 });
  paragraph_(form, "Going Global: If you've sold to someone abroad, how did they pay you? Mention any fees, delays or headaches.",
    { help: "Skip if you've never sold abroad." });
  choice_(form, 'The Money Drama: Has a payment ever been reversed, disputed, or held?',
    ['Never', 'Once', 'More than once'], { required: true });
  paragraph_(form, 'If yes, what happened?');
  choice_(form, 'After Hours: At night or on weekends, how long do customers usually wait for your reply?',
    ['Under 15 minutes', '15–60 minutes', '1–6 hours', 'Until the next morning', 'More than a day'],
    { required: true });
  paragraph_(form, '"Please, what is your last price?" When a customer asks for your last price, how do you decide what to say?');
  choice_(form, "Do you have a lowest price you won't go below for each item?",
    ['Yes, for every item', 'For some items', 'No, I decide in the moment'], { required: true });
  checkbox_(form, 'The Tech Stack: Which tools or subscriptions do you pay for each month?', [
    'Bumpa', 'Meta Verified', 'WhatsApp Business (free)', 'Online store builder (Shopify, Selar, etc.)',
    'Design tools (e.g. Canva)', 'Scheduling or booking app', 'Social media ads', 'None',
  ], { other: true });
  text_(form, 'Roughly how much do you spend on these each month, in total?',
    { help: 'Any currency, e.g. ₦15,000 or $20.' });
  choice_(form, "AI Assistants: Have you used Meta's AI business agent on WhatsApp, Instagram or Messenger?", [
    "I haven't heard of it", "I've heard of it but haven't tried it",
    'I tried it and still use it', 'I tried it and stopped',
  ], { required: true });
  paragraph_(form, 'If you tried it: what did it do well, and what did it fail to do?');
  const alsoBuys = form.addMultipleChoiceItem()
    .setTitle('Do you also buy from sellers through social media or chats?')
    .setRequired(true);

  // Page 3: Buyers
  const buyerPage = form.addPageBreakItem()
    .setTitle('For buyers')
    .setHelpText('Whether you live in Nigeria or abroad, tell us about shopping through the DMs.');
  choice_(form, 'How often do you buy from sellers you find on social media or chat apps?',
    ['Every week', 'A few times a month', 'A few times a year', 'Rarely', 'Never'], { required: true });
  checkbox_(form, 'What do you usually buy?', CATEGORIES, { other: true });
  paragraph_(form, 'The DM Checkout: Think about the last time you bought from a seller you found on social media. What did you buy, how did you pay, and how did it feel?',
    { required: true });
  choice_(form, 'How did you pay that time?', [
    'Bank transfer', 'Mobile money / wallet', 'Card', 'PayPal',
    'Payment link (Paystack, Flutterwave, etc.)', 'Pay on delivery / cash',
    'Money-transfer app (Wise, LemFi, etc.)', 'Crypto / USDT',
  ], { required: true, other: true });
  form.addScaleItem()
    .setTitle('How safe did you feel paying?')
    .setBounds(1, 5)
    .setLabels('Very unsafe', 'Completely safe')
    .setRequired(true);
  choice_(form, 'Was that seller in a different country from you?', ['Yes', 'No', 'Not sure'], { required: true });
  choice_(form, 'The Dealbreaker: Have you ever backed out of buying because of how the seller wanted to be paid?',
    ['Yes', 'No'], { required: true });
  paragraph_(form, 'If yes, what was the dealbreaker?');
  choice_(form, 'Close Calls & Scams: Have you ever been scammed, or nearly scammed, buying through a chat app?',
    ['No', 'Nearly (a close call)', 'Yes', 'Prefer not to say'], { required: true });
  paragraph_(form, "If you're comfortable sharing, what happened?");
  checkbox_(form, 'What makes you trust a seller enough to pay? Pick up to 3.', [
    'Reviews or testimonials', 'Someone I know recommended them', 'Verified badge',
    'Many followers or a long history', 'Videos or live photos of the actual item', 'A video call',
    'Pay on delivery', 'A payment method that can refund me (e.g. card or PayPal)',
  ], { required: true, other: true, maxPicks: 3 });
  choice_(form, 'Peace of Mind: Have you ever chosen a payment method because it could get your money back if something went wrong (for example card or PayPal instead of a bank transfer)?',
    ['Yes', 'No', 'Not sure'], { required: true });
  paragraph_(form, 'If yes, tell us about it. Did it cost you extra?');
  choice_(form, 'When a seller is slow to reply, what do you usually do?',
    ['Wait for them', 'Message another seller', 'Call them', 'Give up on buying'],
    { required: true, other: true });
  choice_(form, 'How do you prefer to buy from a small seller?',
    ['Chat (WhatsApp or DM)', 'Phone call', 'Their website', 'In person'], { required: true, other: true });

  // Page 4: Last step
  const finalPage = form.addPageBreakItem().setTitle('Last step');
  choice_(form, 'Can we quote your answers in our project materials?', [
    'Yes, anonymously', 'Yes, with my first name and business name', "No, please don't quote me",
  ], { required: true });
  choice_(form, 'Would you be open to a 15-minute follow-up chat?', ['Yes', 'No'], { required: true });
  text_(form, 'If yes, your WhatsApp number or email', { help: 'Only used to arrange the chat.' });
  paragraph_(form, "Anything else you'd like to tell us?");

  // Routing needs the page breaks to exist, so it is wired last.
  role.setChoices([
    role.createChoice('I sell online or through chats', sellerPage),
    role.createChoice('I buy from sellers online or through chats', buyerPage),
    role.createChoice('Both', sellerPage),
  ]);
  alsoBuys.setChoices([
    alsoBuys.createChoice('Yes, show me the buyer questions', buyerPage),
    alsoBuys.createChoice('No, take me to the last page', finalPage),
  ]);

  const sheet = SpreadsheetApp.create('Oja interview responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());
  // Newer Forms accounts create unpublished forms; publish if the API supports it.
  if (typeof form.setPublished === 'function') form.setPublished(true);
  form.setAcceptingResponses(true);

  Logger.log('Share this link: ' + form.getPublishedUrl());
  Logger.log('Edit the form:   ' + form.getEditUrl());
  Logger.log('Responses sheet: ' + sheet.getUrl());
}

function choice_(form, title, choices, opts) {
  const item = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices);
  return finish_(item, opts);
}

function checkbox_(form, title, choices, opts) {
  const item = form.addCheckboxItem().setTitle(title).setChoiceValues(choices);
  if (opts && opts.maxPicks) {
    item.setValidation(FormApp.createCheckboxValidation()
      .setHelpText('Pick up to ' + opts.maxPicks + '.')
      .requireSelectAtMost(opts.maxPicks)
      .build());
  }
  return finish_(item, opts);
}

function paragraph_(form, title, opts) {
  return finish_(form.addParagraphTextItem().setTitle(title), opts);
}

function text_(form, title, opts) {
  return finish_(form.addTextItem().setTitle(title), opts);
}

function finish_(item, opts) {
  opts = opts || {};
  if (opts.help) item.setHelpText(opts.help);
  if (opts.other) item.showOtherOption(true);
  item.setRequired(Boolean(opts.required));
  return item;
}
