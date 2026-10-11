(() => {
  'use strict';
  const config = window.DAIRY_CONFIG;
  const products = config.products;
  const CART_KEY = '3friends.enquiry.v1';
  const REQUEST_KEY = '3friends.savedEnquiry.v1';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"/></svg>`;
  const findProduct = (id) => products.find((product) => product.id === id);
  const emailUrl = (message) => `mailto:${config.email}?subject=${encodeURIComponent('3 Friends — product price enquiry')}&body=${encodeURIComponent(message)}`;
  let toastTimeout;
  let cart = readCart();
  let savedRequest = null;

  function readCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      const clean = [];
      for (const item of stored.slice(0, 30)) {
        if (!item || typeof item !== 'object') continue;
        const product = findProduct(item.id);
        if (!product || !Number.isInteger(item.variant) || !product.variants[item.variant] || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
        const existing = clean.find((entry) => entry.id === item.id && entry.variant === item.variant);
        if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
        else clean.push({id: item.id, variant: item.variant, quantity: Math.min(99, item.quantity)});
      }
      return clean;
    } catch { return []; }
  }

  function persistCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* The list still works in memory when storage is unavailable. */ }
    updateCount();
  }

  function updateCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    $$('[data-cart-count]').forEach((element) => { element.textContent = count; });
    $$('[data-open-cart]').forEach((element) => { element.setAttribute('aria-label', `Open enquiry list, ${count} ${count === 1 ? 'item' : 'items'}`); });
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => element.classList.remove('visible'), 3000);
  }

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  }

  function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog.open) dialog.close();
    if (!$('dialog[open]')) document.body.classList.remove('modal-open');
  }

  function productMessage(product, variant) {
    return `Assalam-o-alaikum 3 Friends!\n\nI’m interested in ${product.name} — ${product.variants[variant].label}.\n\nPlease share the current price, availability, and delivery details for Lahore. Thank you!`;
  }

  function renderProducts(filter = 'all') {
    const selected = products.filter((product) => filter === 'all' || product.category === filter);
    $('#product-grid').innerHTML = selected.map((product) => `
      <article class="product-card" data-category="${escape(product.category)}" data-product="${escape(product.id)}">
        <button class="product-image-link" data-view-product="${escape(product.id)}" aria-label="View ${escape(product.name)} details">
          <img src="${escape(product.image)}" alt="${escape(product.alt)}" width="1024" height="1024" loading="lazy">
          <span class="product-tag">${escape(product.tag)}</span><span class="product-view" aria-hidden="true">↗</span>
        </button>
        <div class="product-meta">
          <div class="product-title-row"><h3><button class="product-title" data-view-product="${escape(product.id)}">${escape(product.name)}</button></h3><a class="price-inquiry" data-product-inquiry="${escape(product.id)}" href="${escape(emailUrl(productMessage(product,0)))}">Ask for price <span aria-hidden="true">↗</span></a></div>
          <p class="product-note">${escape(product.note)}</p><p class="product-description">${escape(product.description)}</p>
          <div class="product-controls"><label class="sr-only" for="variant-${escape(product.id)}">Choose ${escape(product.name)} size</label><select class="variant-select" id="variant-${escape(product.id)}" data-card-variant="${escape(product.id)}">${product.variants.map((variant, index) => `<option value="${index}">${escape(variant.label)}</option>`).join('')}</select><button class="add-button" data-add-product="${escape(product.id)}" aria-label="Add ${escape(product.name)} to enquiry list">${icon('plus')}</button></div>
        </div>
      </article>`).join('');
  }

  function addToCart(id, variant) {
    const product = findProduct(id);
    if (!product || !Number.isInteger(variant) || !product.variants[variant]) return;
    const existing = cart.find((item) => item.id === id && item.variant === variant);
    if (existing && existing.quantity >= 99) { toast('You can enquire about up to 99 of each size.'); return; }
    if (existing) existing.quantity += 1;
    else cart.push({id, variant, quantity: 1});
    persistCart();
    toast(`${product.name} added to your enquiry list`);
    if ($('#cart-dialog').open) renderCart();
  }

  function renderCart() {
    if (!cart.length) {
      $('#cart-content').innerHTML = `<div class="empty-cart">${icon('bag')}<h3>A little goodness awaits.</h3><p>Add your favourite products and sizes.<br>We’ll help you ask for prices by email.</p><button class="button button-green" data-continue-shopping>Explore the dairy ${icon('arrow')}</button></div>`;
      $('#cart-footer').innerHTML = '';
      $('#cart-footer').hidden = true;
      return;
    }
    $('#cart-footer').hidden = false;
    $('#cart-content').innerHTML = cart.map((item, index) => {
      const product = findProduct(item.id);
      return `<article class="cart-item"><img src="${escape(product.image)}" alt="${escape(product.name)}" width="78" height="89"><div class="cart-item-content"><div class="cart-item-top"><h3>${escape(product.name)}</h3></div><p class="cart-variant">${escape(product.variants[item.variant].label)}</p><div class="cart-item-bottom"><div class="quantity-control" role="group" aria-label="${escape(product.name)} ${escape(product.variants[item.variant].label)} quantity"><button data-quantity="${index}" data-delta="-1" aria-label="Decrease ${escape(product.name)} quantity">−</button><span aria-live="polite">${item.quantity}</span><button data-quantity="${index}" data-delta="1" aria-label="Increase ${escape(product.name)} quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button></div><button class="remove-button" data-remove="${index}" aria-label="Remove ${escape(product.name)} ${escape(product.variants[item.variant].label)}">Remove</button></div></div></article>`;
    }).join('');
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    $('#cart-footer').innerHTML = `<div class="total-row"><span>${count} ${count === 1 ? 'item' : 'items'} in your enquiry</span><span class="quote-label">Prices on enquiry</span></div><p class="delivery-row">Ask us for current prices, availability, and Lahore delivery.</p><button class="button button-green" id="begin-enquiry">Prepare email enquiry ${icon('arrow')}</button><p class="cart-smallprint">No payment is taken here. The team will confirm your quote and delivery before you place an order.</p>`;
  }

  function showProduct(id) {
    const product = findProduct(id);
    if (!product) return;
    const current = $(`#variant-${id}`);
    const variant = current ? Number(current.value) : 0;
    $('#product-detail').innerHTML = `<div class="product-detail-grid"><img src="${escape(product.image)}" alt="${escape(product.alt)}" width="1024" height="1024"><div class="product-detail-copy"><div class="eyebrow">${escape(product.tag)}</div><h2 id="product-dialog-heading">${escape(product.name)}</h2><div class="detail-note">${escape(product.note)}</div><p>${escape(product.detail)}</p><div class="detail-line"><strong>AT YOUR TABLE</strong>${escape(product.serving)}</div><div class="detail-line"><strong>LOOKING AFTER IT</strong>${escape(product.storage)}</div><p class="detail-enquiry-note">For current prices and availability, email us.</p><div class="detail-buy"><label class="sr-only" for="detail-variant">Choose ${escape(product.name)} size</label><select class="variant-select" id="detail-variant">${product.variants.map((entry, index) => `<option value="${index}" ${index === variant ? 'selected' : ''}>${escape(entry.label)}</option>`).join('')}</select><button class="button button-green" data-detail-add="${escape(product.id)}">Add to list ${icon('plus')}</button></div><a class="detail-email" id="detail-email" data-id="${escape(product.id)}" href="${escape(emailUrl(productMessage(product,variant)))}">Ask for a price by email ↗</a></div></div>`;
    openDialog('product-dialog');
  }

  function beginEnquiry() {
    if (!cart.length) return;
    closeDialog('cart-dialog');
    $('#checkout-body').innerHTML = `<div class="checkout-body-inner"><div class="checkout-notice">Let’s ask for today’s prices and availability. Your message will open in your email app for you to review and send to <strong>3 Friends · ${escape(config.email)}</strong>.</div><div class="checkout-summary">${cart.map((item) => { const product = findProduct(item.id); return `<div class="checkout-summary-item"><span>${escape(product.name)} · ${escape(product.variants[item.variant].label)}</span><strong>× ${item.quantity}</strong></div>`; }).join('')}<div class="checkout-summary-item checkout-total"><span>Prices &amp; delivery</span><span>Confirmed by the team</span></div></div><form id="enquiry-form"><div class="form-grid"><div class="field"><label for="customer-name">Your name <span class="optional-label">(optional)</span></label><input id="customer-name" name="name" maxlength="80" autocomplete="name" placeholder="What should we call you?"></div><div class="field"><label for="customer-area">Lahore area <span class="optional-label">(optional)</span></label><input id="customer-area" name="area" maxlength="120" autocomplete="address-level3" placeholder="e.g. Johar Town"></div><div class="field full"><label for="customer-notes">Anything else? <span class="optional-label">(optional)</span></label><textarea id="customer-notes" name="notes" maxlength="600" placeholder="Delivery questions, a larger quantity, or a special request..."></textarea></div></div><button class="button button-green checkout-submit" type="submit">Prepare my message ${icon('arrow')}</button><p class="checkout-consent">You’ll choose when to send your email. If you use webmail, you can copy the prepared enquiry text. This is an enquiry, and your order is accepted only after the team confirms it with you.</p></form></div>`;
    openDialog('checkout-dialog');
  }

  function buildMessage(request) {
    const lines = ['Assalam-o-alaikum 3 Friends!', '', 'Please share prices and availability for:'];
    request.items.forEach((item) => lines.push(`• ${item.quantity} × ${item.name} — ${item.size}`));
    if (request.customer.name) lines.push('', `Name: ${request.customer.name}`);
    if (request.customer.area) lines.push(`Lahore area: ${request.customer.area}`);
    if (request.customer.notes) lines.push('', `Notes: ${request.customer.notes}`);
    lines.push('', 'Please also confirm delivery charges, estimated timing, and payment options. Thank you!');
    return lines.join('\n');
  }

  function prepareEnquiry(form) {
    if (!cart.length) { closeDialog('checkout-dialog'); toast('Add a product to your enquiry list first.'); return; }
    const data = new FormData(form);
    const request = {
      reference: `3F-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'prepared-not-sent',
      customer: {name: String(data.get('name') || '').trim().slice(0,80), area: String(data.get('area') || '').trim().slice(0,120), notes: String(data.get('notes') || '').trim().slice(0,600)},
      items: cart.map((item) => { const product = findProduct(item.id); return {name: product.name, size: product.variants[item.variant].label, quantity: item.quantity}; })
    };
    savedRequest = request;
    try { localStorage.setItem(REQUEST_KEY, JSON.stringify(request)); } catch { /* Download and email drafts still work without browser storage. */ }
    const message = buildMessage(request);
    $('#checkout-body').innerHTML = `<div class="request-success"><div class="success-mark" aria-hidden="true">✓</div><h3>Your enquiry is ready.</h3><p>Open your email app to review and send your message to<br><strong>3 Friends · ${escape(config.email)}</strong>.<br>Nothing has been sent yet.</p><div class="message-preview" id="message-preview">${escape(message)}</div><div class="request-actions"><a class="button button-green" href="${escape(emailUrl(message))}">Open email draft ${icon('arrow')}</a><button class="button button-outline" id="copy-enquiry">Copy enquiry text</button><button class="text-button download-enquiry" id="download-enquiry">Download a copy of this enquiry</button><button class="text-button" data-close="checkout-dialog">Back to the dairy</button></div><p class="success-smallprint">The team will share prices and confirm your order details by email. Using webmail? Copy the enquiry text and email it to the address above.</p></div>`;
    $('#checkout-body .request-success').setAttribute('tabindex','-1');
    $('#checkout-body .request-success').focus();
  }

  function downloadEnquiry() {
    if (!savedRequest) return;
    const text = `${config.brand} — product enquiry\nReference: ${savedRequest.reference}\nPrepared on: ${new Date(savedRequest.createdAt).toLocaleString()}\nStatus: prepared; not sent\n\n${buildMessage(savedRequest)}\n\nContact: ${config.email}\n`;
    const url = URL.createObjectURL(new Blob([text], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${savedRequest.reference}-enquiry.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyEnquiry() {
    if (!savedRequest) return;
    const button = $('#copy-enquiry');
    try {
      await navigator.clipboard.writeText(buildMessage(savedRequest));
      button.textContent = 'Copied — ready to paste';
    } catch {
      const range = document.createRange();
      range.selectNodeContents($('#message-preview'));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Message selected — press Ctrl+C to copy';
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, a');
    if (!button) return;
    if (button.matches('[data-open-cart]')) { renderCart(); openDialog('cart-dialog'); }
    if (button.matches('[data-close]')) closeDialog(button.dataset.close);
    if (button.matches('[data-open-policy]')) { $('#policy-result').textContent = ''; openDialog('policy-dialog'); }
    if (button.matches('[data-view-product]')) showProduct(button.dataset.viewProduct);
    if (button.matches('[data-add-product]')) { const id = button.dataset.addProduct; addToCart(id, Number($(`#variant-${id}`).value)); }
    if (button.matches('[data-detail-add]')) { addToCart(button.dataset.detailAdd, Number($('#detail-variant').value)); closeDialog('product-dialog'); renderCart(); openDialog('cart-dialog'); }
    if (button.matches('[data-filter]')) { $$('[data-filter]').forEach((filter) => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); }); renderProducts(button.dataset.filter); }
    if (button.matches('[data-continue-shopping]')) { closeDialog('cart-dialog'); $('#collection').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
    if (button.matches('[data-quantity]')) { const index = Number(button.dataset.quantity); if (cart[index]) { cart[index].quantity = Math.min(99, cart[index].quantity + Number(button.dataset.delta)); if (cart[index].quantity <= 0) cart.splice(index,1); persistCart(); renderCart(); const next = $(`[data-quantity="${index}"][data-delta="${button.dataset.delta}"]`); if (next) next.focus(); } }
    if (button.matches('[data-remove]')) { cart.splice(Number(button.dataset.remove),1); persistCart(); renderCart(); }
    if (button.id === 'begin-enquiry') beginEnquiry();
    if (button.id === 'copy-enquiry') copyEnquiry();
    if (button.id === 'download-enquiry') downloadEnquiry();
    if (button.id === 'menu-toggle') { const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation'); $('#mobile-nav').hidden = expanded; }
    if (button.closest('#mobile-nav')) { $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded','false'); $('#menu-toggle').setAttribute('aria-label','Open navigation'); }
    if (button.id === 'clear-data') { try { localStorage.removeItem(CART_KEY); localStorage.removeItem(REQUEST_KEY); } catch {} cart = []; savedRequest = null; updateCount(); $('#policy-result').textContent = 'Your saved list and enquiry have been cleared from this browser.'; }
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-card-variant]')) { const id = event.target.dataset.cardVariant; const product = findProduct(id); $(`[data-product-inquiry="${id}"]`).href = emailUrl(productMessage(product,Number(event.target.value))); }
    if (event.target.id === 'detail-variant') { const link = $('#detail-email'); link.href = emailUrl(productMessage(findProduct(link.dataset.id),Number(event.target.value))); }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'enquiry-form') { event.preventDefault(); prepareEnquiry(event.target); }
  });

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.classList.remove('modal-open'); });
    dialog.addEventListener('click', (event) => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog.id); });
  });
  window.addEventListener('storage', (event) => { if (event.key === CART_KEY || event.key === null) { cart = readCart(); updateCount(); if ($('#cart-dialog').open) renderCart(); } });
  $('#year').textContent = String(new Date().getFullYear());
  renderProducts();
  updateCount();
})();
