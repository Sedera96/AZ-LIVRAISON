/* az-sync.js — Gestion centralisée AZ LIVRAISON */
const AZ_CONFIG = {
  SUPER_ADMIN_EMAIL: "randrianantenainasedera96@gmail.com",
  STORAGE_KEY: "az_livraison_db_v1",
  SESSION_KEY: "az_livraison_session_v1"
};

function getDB() {
  const raw = localStorage.getItem(AZ_CONFIG.STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) {}
  }
  const initial = {
    users: [
      {
        id: "ADM-0001",
        uniqueCode: "ADM-0001",
        name: "Super Administrateur AZ",
        email: AZ_CONFIG.SUPER_ADMIN_EMAIL,
        phone: "034 65 653 14",
        role: "admin",
        status: "approved",
        isSuperAdmin: true
      }
    ],
    validationRequests: [],
    orders: [],
    notifications: [],
    clientCounter: 1,
    adminCounter: 1
  };
  saveDB(initial);
  return initial;
}

function saveDB(db) {
  localStorage.setItem(AZ_CONFIG.STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("az-db-updated"));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(AZ_CONFIG.SESSION_KEY) || "null");
  } catch (e) {
    return null;
  }
}

function setSession(user) {
  if (user) {
    sessionStorage.setItem(AZ_CONFIG.SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AZ_CONFIG.SESSION_KEY);
  }
}

function requireAuth(expectedRole) {
  const session = getSession();
  if (!session || session.status !== "approved") {
    window.location.href = "index.html?auth=required";
    return null;
  }
  if (expectedRole && session.role !== expectedRole) {
    window.location.href = session.role === "admin" ? "Administrateur.html" : "Client.html";
    return null;
  }
  return session;
}

function generateValidationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function requestRegistration({ name, email, phone, password, requestedRole }) {
  let db;
  try {
    db = getDB();
  } catch (error) {
    return { ok: false, message: "Impossible d'accéder au stockage de ce navigateur. Désactivez la navigation privée ou essayez Chrome/Safari." };
  }
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPhone = String(phone || "").trim();
  const exists = db.users.some(u => u.email.toLowerCase() === cleanEmail) ||
                 db.validationRequests.some(r => r.email.toLowerCase() === cleanEmail && r.status === "pending");
  if (exists) {
    return { ok: false, message: "Un compte ou une demande existe déjà avec cette adresse e-mail." };
  }

  const code = generateValidationCode();
  const req = {
    id: "REQ-" + Date.now(),
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    password: password,
    requestedRole: requestedRole === "admin" ? "admin" : "client",
    validationCode: code,
    approverEmail: AZ_CONFIG.SUPER_ADMIN_EMAIL,
    status: "pending",
    createdAt: new Date().toLocaleString("fr-FR")
  };
  db.validationRequests.unshift(req);

  db.notifications.unshift({
    id: "NOTIF-" + Date.now(),
    targetRole: "admin",
    targetEmail: AZ_CONFIG.SUPER_ADMIN_EMAIL,
    title: "Code de validation inscription",
    message: `Demande (${req.requestedRole}) pour ${req.name} (${req.email}). Code à valider par ${AZ_CONFIG.SUPER_ADMIN_EMAIL} : ${code}`,
    read: false,
    createdAt: new Date().toLocaleString("fr-FR")
  });

  try {
    saveDB(db);
  } catch (error) {
    db.validationRequests.shift();
    db.notifications.shift();
    return { ok: false, message: "L'inscription n'a pas pu être sauvegardée sur cet appareil. Vérifiez l'espace disponible et les paramètres du navigateur." };
  }
  return {
    ok: true,
    requestId: req.id,
    codeSentTo: AZ_CONFIG.SUPER_ADMIN_EMAIL,
    demoCode: code,
    message: `Inscription enregistrée. Le code de validation est réservé à ${AZ_CONFIG.SUPER_ADMIN_EMAIL}.`
  };
}

function approveRegistrationBySuperAdmin(requestId, codeInput, approverEmailInput) {
  const db = getDB();
  const approver = (approverEmailInput || "").trim().toLowerCase();
  if (approver !== AZ_CONFIG.SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, message: `Seule l'adresse ${AZ_CONFIG.SUPER_ADMIN_EMAIL} peut valider l'inscription ou ajouter un administrateur.` };
  }
  const req = db.validationRequests.find(r => r.id === requestId);
  if (!req) return { ok: false, message: "Demande introuvable." };
  if (String(codeInput || "").trim() !== req.validationCode) {
    return { ok: false, message: "Code de validation incorrect." };
  }

  let uniqueCode;
  if (req.requestedRole === "admin") {
    db.adminCounter += 1;
    uniqueCode = "ADM-" + String(db.adminCounter).padStart(4, "0");
  } else {
    db.clientCounter += 1;
    uniqueCode = "AZ-CLT-" + String(db.clientCounter).padStart(4, "0");
  }

  const newUser = {
    id: uniqueCode,
    uniqueCode,
    name: req.name,
    email: req.email,
    phone: req.phone,
    role: req.requestedRole,
    password: req.password,
    status: "approved",
    approvedBy: AZ_CONFIG.SUPER_ADMIN_EMAIL,
    approvedAt: new Date().toLocaleString("fr-FR")
  };

  db.users.push(newUser);
  req.status = "approved";
  req.assignedCode = uniqueCode;

  db.notifications.unshift({
    id: "NOTIF-" + Date.now(),
    targetRole: req.requestedRole,
    targetEmail: req.email,
    title: "Compte validé",
    message: `Votre compte (${req.requestedRole}) est validé par ${AZ_CONFIG.SUPER_ADMIN_EMAIL}. Identifiant unique : ${uniqueCode}`,
    read: false,
    createdAt: new Date().toLocaleString("fr-FR")
  });

  saveDB(db);
  return { ok: true, user: newUser, message: `Compte validé avec l'identifiant unique ${uniqueCode}.` };
}

function loginUser(identifier, password) {
  const db = getDB();
  const idClean = (identifier || "").trim().toLowerCase();
  const phoneClean = idClean.replace(/[^0-9]/g, "");
  const user = db.users.find(u => {
    const savedPhone = String(u.phone || "").replace(/[^0-9]/g, "");
    return u.email.toLowerCase() === idClean ||
      (phoneClean && savedPhone === phoneClean) ||
      String(u.uniqueCode || "").toLowerCase() === idClean;
  });
  if (!user) {
    const pending = db.validationRequests.find(r => r.email.toLowerCase() === idClean && r.status === "pending");
    if (pending) {
      return { ok: false, message: `Votre inscription est en attente de validation par ${AZ_CONFIG.SUPER_ADMIN_EMAIL}.` };
    }
    return { ok: false, message: "Identifiant introuvable." };
  }
  if (user.password && user.password !== password) {
    return { ok: false, message: "Mot de passe incorrect." };
  }
  if (user.status !== "approved") {
    return { ok: false, message: "Compte non validé par l'administrateur." };
  }
  setSession(user);
  return { ok: true, user };
}

function submitClientOrder(orderPayload) {
  const session = requireAuth("client");
  if (!session) return null;
  const db = getDB();
  const order = {
    ...orderPayload,
    orderId: "CMD-" + Date.now(),
    clientId: session.uniqueCode,
    clientEmail: session.email,
    clientName: orderPayload.sender || session.name,
    status: "pending",
    adminNote: "",
    createdAt: new Date().toLocaleString("fr-FR")
  };
  db.orders.unshift(order);
  db.notifications.unshift({
    id: "NOTIF-" + Date.now(),
    targetRole: "admin",
    targetEmail: "all-admins",
    title: "Nouveau bon de commande / colis",
    message: `Colis/commande ${order.invoiceNumber} soumis par ${order.clientName} (${order.clientId}).`,
    read: false,
    createdAt: new Date().toLocaleString("fr-FR")
  });
  saveDB(db);
  return order;
}

function reviewClientOrder(orderId, decision, adminNote) {
  const session = requireAuth("admin");
  if (!session) return null;
  const db = getDB();
  const order = db.orders.find(o => o.orderId === orderId);
  if (!order) return null;

  order.status = decision === "validated" ? "validated" : "rejected";
  order.adminNote = adminNote || "";
  order.reviewedBy = session.email;
  order.reviewedAt = new Date().toLocaleString("fr-FR");

  const statusLabel = order.status === "validated" ? "VALIDÉ" : "NON VALIDÉ (REFUSÉ)";
  db.notifications.unshift({
    id: "NOTIF-" + Date.now(),
    targetRole: "client",
    targetEmail: order.clientEmail,
    title: `Bon de commande ${order.invoiceNumber} : ${statusLabel}`,
    message: order.adminNote ? `${statusLabel} — Note : ${order.adminNote}` : `Votre bon de commande ${order.invoiceNumber} est ${statusLabel}.`,
    read: false,
    createdAt: new Date().toLocaleString("fr-FR")
  });

  saveDB(db);
  return order;
}

function exportBackupToPC(filename = "az-livraison-sauvegarde-pc.json") {
  const db = getDB();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackupFromPC(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.orders)) {
        saveDB(parsed);
        if (callback) callback(true);
      } else {
        alert("Format de sauvegarde invalide.");
      }
    } catch (e) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
}
