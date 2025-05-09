import React, { useState, useEffect } from "react";
import {
  FiHome, FiBox, FiUpload, FiDollarSign, FiSettings,
  FiLogOut, FiMenu, FiEdit2, FiTrash2, FiPlus,
  FiCheck, FiX, FiUser, FiCreditCard, FiShoppingCart,
  FiClock, FiAlertCircle, FiX as FiClose, FiCheckCircle
} from "react-icons/fi";
import {
  collection, addDoc, query, where, onSnapshot,
  doc, deleteDoc, setDoc, getDoc, serverTimestamp,
  updateDoc, orderBy
} from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

const DashboardProvider = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [username, setUsername] = useState("Usuario");
  const [email, setEmail] = useState("");
  const [uid, setUid] = useState("");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState({
    image: "",
    category: "Netflix",
    accountType: "Premium",
    name: "",
    price: "",
    renewal: false,
    renewalPrice: "",
    stock: 1,
    duration: "",
    providerPhone: "",
    details: "",
    terms: "",
    status: "En stock",
    accounts: Array(1).fill({ email: "", password: "", profile: "", pin: "" }),
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [successModal, setSuccessModal] = useState({ open: false, message: "" });
  const [accountDetails, setAccountDetails] = useState({
    email: "",
    password: "",
    preferences: "",
  });
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("Yape");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [providerBalance, setProviderBalance] = useState(0);
  const [editOrderModalOpen, setEditOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editOrderError, setEditOrderError] = useState("");

  const navigate = useNavigate();
  const auth = getAuth();

  const formatDate = (date) => {
    if (!date) return "No especificada";
    try {
      const d = date instanceof Date ? date : date?.toDate?.() || new Date(date);
      if (isNaN(d.getTime())) return "Fecha inválida";
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (err) {
      console.error("Error formatting date:", err);
      return "Fecha inválida";
    }
  };

  const getCategoryDisplayName = (type) => {
    const categoryMap = {
      netflix: "Netflix",
      spotify: "Spotify",
      disney: "Disney",
      max: "Max",
      primevideo: "Prime Video",
      vix: "Vix",
      crunchyroll: "Crunchyroll",
      canva: "Canva",
      chatgpt: "ChatGPT",
      redessociales: "Redes Sociales",
      dgo: "Dgo",
      ligamax: "Liga Max",
      movistarplay: "Movistar Play",
      youtube: "Youtube",
      deezer: "Deezer",
      tidal: "Tidal",
      vpn: "Vpn",
      wintv: "WinTv",
      applemusic: "Apple Music",
      appletv: "Apple TV",
      iptv: "Iptv",
      flujotv: "Flujo Tv",
      vikirakuten: "Viki Rakuten",
      pornhub: "Pornhub",
      paramount: "Paramount",
      licencias: "Licencias",
      capcut: "Capcut",
      duolingo: "Duolingo",
      buscapersonas: "BuscaPersonas"
    };
    return categoryMap[type?.toLowerCase()] || "Otro";
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setEmail(user.email || "");
        setUid(user.uid);
        fetchUserData(user.uid);
      }
    });
    return () => unsubscribe();
  }, [auth, navigate]);

  const fetchUserData = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUsername(userData.username || "Usuario");
        setAccountDetails({
          email: userData.email || "",
          password: "",
          preferences: userData.preferences || "",
        });
      }
      setLoading(false);
    } catch (error) {
      setError("Error al cargar datos del usuario");
      console.error("Error fetching user data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async (email) => {
      try {
        const adminDoc = await getDoc(doc(db, "admins", email));
        setIsAdmin(adminDoc.exists());
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };
    if (email) checkAdminStatus(email);
  }, [email]);

  useEffect(() => {
    if (!username) return;
    const q = query(collection(db, "products"), where("provider", "==", username));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(fetchedProducts);
    }, (err) => {
      console.error("Error fetching products:", err);
      setError("Error al cargar productos");
    });
    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "sales"),
      where("providerId", "==", uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSales = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          productName: data.productName || "Producto sin nombre",
          category: data.type || "netflix",
          buyer: data.customerName || data.customerNAME || "Comprador desconocido",
          buyerEmail: data.customerEmail || "Sin email",
          buyerPhone: data.phoneNumber || "Sin teléfono",
          date: data.saleDate ? data.saleDate : data.createdAt || new Date(),
          amount: parseFloat(data.price) || 0,
          status: data.status || "completed", // Cambiar de "pending" a "completed"
          accountDetails: data.accountDetails || { email: "No disponible", password: "No disponible", profile: "N/A", pin: "" },
        };
      });
      setOrders(fetchedSales);
      setBalanceLoading(false);
    }, (err) => {
      console.error("Error fetching sales:", err);
      setError("Error al cargar ventas");
      setBalanceLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (!username) return;
    const q = query(
      collection(db, "withdrawals"),
      where("provider", "==", username),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWithdrawals = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: parseFloat(data.amount) || 0,
          createdAt: data.createdAt || new Date(),
          processedAt: data.processedAt || null,
        };
      });
      setWithdrawals(fetchedWithdrawals);
      setBalanceLoading(false);
    }, (err) => {
      console.error("Error fetching withdrawals:", err);
      setError("Error al cargar retiros");
    });
    return () => unsubscribe();
  }, [username]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(
      collection(db, "withdrawals"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWithdrawals = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: parseFloat(data.amount) || 0,
          createdAt: data.createdAt || new Date(),
        };
      });
      setPendingWithdrawals(fetchedWithdrawals);
    }, (err) => {
      console.error("Error fetching pending withdrawals:", err);
      setError("Error al cargar solicitudes de retiro pendientes");
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!username) return;
    const balanceDocRef = doc(db, "providerBalances", username);
    const unsubscribe = onSnapshot(balanceDocRef, (doc) => {
      if (doc.exists()) {
        setProviderBalance(doc.data().balance || 0);
      } else {
        setDoc(balanceDocRef, { balance: 0, provider: username, updatedAt: serverTimestamp() });
        setProviderBalance(0);
      }
      setBalanceLoading(false);
    }, (err) => {
      console.error("Error fetching provider balance:", err);
      setError("Error al cargar el saldo del proveedor");
      setBalanceLoading(false);
    });
    return () => unsubscribe();
  }, [username]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate("/login"))
      .catch((error) => {
        setError("Error al cerrar sesión");
        console.error("Logout error:", error);
      });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeInBytes) {
        if (isEdit) {
          setEditError("La imagen no debe exceder los 10MB");
        } else {
          setError("La imagen no debe exceder los 10MB");
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setSelectedProduct((prev) => ({ ...prev, image: reader.result }));
        } else {
          setProduct((prev) => ({ ...prev, image: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStockChange = (e) => {
    const newStock = parseInt(e.target.value) || 1;
    const currentAccounts = product.accounts || [];
    if (newStock > currentAccounts.length) {
      const newAccounts = [...currentAccounts];
      while (newAccounts.length < newStock) {
        newAccounts.push({ email: "", password: "", profile: "", pin: "" });
      }
      setProduct({ ...product, stock: newStock, accounts: newAccounts });
    } else if (newStock < currentAccounts.length) {
      const newAccounts = currentAccounts.slice(0, Math.max(newStock, 1));
      setProduct({ ...product, stock: newStock, accounts: newAccounts });
    } else {
      setProduct({ ...product, stock: newStock });
    }
  };

  const handleEditStockChange = (e) => {
    const newStock = parseInt(e.target.value) || 1;
    const currentAccounts = selectedProduct.accounts || [];
    let newAccounts = [...currentAccounts];
    if (newStock > newAccounts.length) {
      while (newAccounts.length < newStock) {
        newAccounts.push({ email: "", password: "", profile: "", pin: "" });
      }
    } else if (newStock < newAccounts.length) {
      newAccounts = newAccounts.slice(0, Math.max(newStock, 1));
    }
    setSelectedProduct({ ...selectedProduct, stock: newStock, accounts: newAccounts });
  };

  const handleAccountFieldChange = (index, field, value) => {
    const newAccounts = [...product.accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setProduct({ ...product, accounts: newAccounts });
  };

  const handleEditAccountFieldChange = (index, field, value) => {
    setSelectedProduct((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc, i) =>
        i === index ? { ...acc, [field]: value } : acc
      ),
    }));
  };

  const handleOrderAccountChange = (e) => {
    const { name, value } = e.target;
    setSelectedOrder((prev) => ({
      ...prev,
      accountDetails: { ...prev.accountDetails, [name]: value },
    }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!product.name || !product.price) {
      setError("Por favor complete todos los campos obligatorios");
      return;
    }
    if (product.renewal && !product.renewalPrice) {
      setError("Por favor ingrese el precio de renovación");
      return;
    }
    if (product.status === "En stock") {
      const hasEmptyAccounts = product.accounts.some((acc) => !acc.email || !acc.password);
      if (hasEmptyAccounts) {
        setError("Por favor complete todos los campos de las cuentas");
        return;
      }
    }

    try {
      const productData = {
        ...product,
        provider: username,
        providerId: uid,
        providerPhone: product.status === "En stock" ? (product.providerPhone || "") : (product.providerPhone || "No especificado"),
        createdAt: serverTimestamp(),
        availableAccounts: product.status === "En stock" ? product.accounts.length : 0,
      };
      const productRef = await addDoc(collection(db, "products"), productData);

      if (product.status === "En stock") {
        const accountsCollection = collection(db, `products/${productRef.id}/accounts`);
        for (const account of product.accounts) {
          await addDoc(accountsCollection, {
            email: account.email,
            password: account.password,
            profile: account.profile || "",
            pin: account.pin || "",
            status: "available",
          });
        }
      }

      setProduct({
        image: "",
        category: "Netflix",
        accountType: "Premium",
        name: "",
        price: "",
        renewal: false,
        renewalPrice: "",
        stock: 1,
        duration: "",
        providerPhone: "",
        details: "",
        terms: "",
        status: "En stock",
        accounts: [{ email: "", password: "", profile: "", pin: "" }],
      });

      setActiveSection("inventario");
      setSuccessModal({ open: true, message: "Producto subido exitosamente!" });
    } catch (error) {
      console.error("Error al subir el producto:", error);
      setError(`Error al subir el producto: ${error.message}`);
    }
  };

  const handleEdit = (product) => {
    setEditError("");
    setSelectedProduct({
      ...product,
      accounts: product.status === "En stock" 
        ? (product.accounts || Array(Math.max(product.stock || 1, 1)).fill({ email: "", password: "", profile: "", pin: "" }))
        : [],
      providerId: product.providerId || uid,
      accountType: product.accountType || "Premium",
      renewal: product.renewal || false,
      renewalPrice: product.renewalPrice || "",
    });
    setEditModalOpen(true);
  };

  const handleUpdateProduct = async () => {
    setEditError("");
    if (!selectedProduct.name || !selectedProduct.price) {
      setEditError("Por favor complete todos los campos obligatorios");
      return;
    }
    if (selectedProduct.renewal && !selectedProduct.renewalPrice) {
      setEditError("Por favor ingrese el precio de renovación");
      return;
    }
    if (selectedProduct.status === "En stock") {
      const hasEmptyAccounts = selectedProduct.accounts.some((acc) => !acc.email || !acc.password);
      if (hasEmptyAccounts) {
        setEditError("Por favor complete todos los campos de las cuentas");
        return;
      }
    }

    try {
      const productRef = doc(db, "products", selectedProduct.id);
      await setDoc(productRef, {
        ...selectedProduct,
        providerId: selectedProduct.providerId || uid,
        availableAccounts: selectedProduct.status === "En stock" ? (selectedProduct.accounts?.length || 0) : 0,
      }, { merge: true });
      setEditModalOpen(false);
      setSuccessModal({ open: true, message: "Producto actualizado exitosamente!" });
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      setEditError("Error al actualizar el producto");
    }
  };

  const handleDelete = async (productId) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      setSuccessModal({ open: true, message: "Producto eliminado exitosamente!" });
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      setError("Error al eliminar el producto");
    }
  };

  const handleUpdateAccount = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          {
            preferences: accountDetails.preferences,
            ...(accountDetails.password && { password: accountDetails.password }),
          },
          { merge: true }
        );
        setSuccessModal({ open: true, message: "Configuración actualizada correctamente!" });
      }
    } catch (error) {
      console.error("Error al actualizar la configuración:", error);
      setError("Error al actualizar la configuración");
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError("Ingrese un monto válido");
      return;
    }
    if (parseFloat(withdrawAmount) > providerBalance) {
      setError("No tienes suficientes fondos disponibles");
      return;
    }
    if (!withdrawAccount) {
      setError("Ingrese los datos de su cuenta");
      return;
    }
    try {
      await addDoc(collection(db, "withdrawals"), {
        provider: username,
        providerEmail: email,
        amount: parseFloat(withdrawAmount),
        method: withdrawMethod,
        account: withdrawAccount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setWithdrawAmount("");
      setWithdrawAccount("");
      setSuccessModal({ open: true, message: "Solicitud de retiro enviada correctamente" });
    } catch (error) {
      console.error("Error al solicitar retiro:", error);
      setError("Error al solicitar retiro");
    }
  };

  const handleWithdrawAction = async (withdrawalId, action) => {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      if (!withdrawalDoc.exists()) {
        throw new Error("Solicitud de retiro no encontrada");
      }
      const withdrawalData = withdrawalDoc.data();
      const provider = withdrawalData.provider;
      const amount = parseFloat(withdrawalData.amount);

      if (action === "approved") {
        const balanceDocRef = doc(db, "providerBalances", provider);
        const balanceDoc = await getDoc(balanceDocRef);
        let currentBalance = 0;
        if (balanceDoc.exists()) {
          currentBalance = balanceDoc.data().balance || 0;
        }
        if (amount > currentBalance) {
          setError("El proveedor no tiene suficientes fondos para aprobar este retiro");
          return;
        }
        await setDoc(balanceDocRef, {
          balance: currentBalance - amount,
          provider,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      await updateDoc(withdrawalRef, {
        status: action,
        processedAt: serverTimestamp(),
        processedBy: email,
      });

      setSuccessModal({ 
        open: true, 
        message: action === "approved" ? "Retiro aprobado y saldo actualizado correctamente" : "Retiro rechazado" 
      });
    } catch (error) {
      console.error("Error al procesar retiro:", error);
      setError("Error al procesar retiro: " + error.message);
    }
  };

  const handleEditOrder = (order) => {
    setEditOrderError("");
    setSelectedOrder({
      ...order,
      accountDetails: {
        email: order.accountDetails.email || "",
        password: order.accountDetails.password || "",
        profile: order.accountDetails.profile || "",
        pin: order.accountDetails.pin || "",
      },
    });
    setEditOrderModalOpen(true);
  };

  const handleUpdateOrder = async () => {
    setEditOrderError("");
    if (!selectedOrder.accountDetails.email || !selectedOrder.accountDetails.password) {
      setEditOrderError("Por favor complete todos los campos obligatorios de la cuenta");
      return;
    }

    try {
      const orderRef = doc(db, "sales", selectedOrder.id);
      await updateDoc(orderRef, {
        accountDetails: selectedOrder.accountDetails,
        updatedAt: serverTimestamp(),
      });
      setEditOrderModalOpen(false);
      setSuccessModal({ open: true, message: "Detalles de la cuenta actualizados exitosamente!" });
    } catch (error) {
      console.error("Error al actualizar los detalles de la cuenta:", error);
      setEditOrderError("Error al actualizar los detalles de la cuenta");
    }
  };

  const totalEarnings = balanceLoading ? 0 : orders.reduce((total, order) => total + (order.amount || 0), 0);
  const totalWithdrawn = balanceLoading ? 0 : withdrawals.reduce((total, withdrawal) => total + (withdrawal.status === "approved" ? withdrawal.amount : 0), 0);
  const calculateAvailableBalance = () => balanceLoading ? 0 : providerBalance;
  const availableBalance = calculateAvailableBalance();
  const totalStock = products.reduce((total, product) => total + (parseInt(product.stock) || 0), 0);
  const handleActivateOrder = async (orderId) => {
    try {
      const orderRef = doc(db, "sales", orderId);
      await updateDoc(orderRef, {
        status: "completed",
        updatedAt: serverTimestamp(),
      });
      setSuccessModal({ open: true, message: "Pedido activado exitosamente!" });
    } catch (error) {
      console.error("Error al activar el pedido:", error);
      setError("Error al activar el pedido");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl text-center max-w-2xl mx-auto border border-gray-700/50">
          <FiAlertCircle className="mx-auto text-4xl text-red-400 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => setError("")}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all duration-300"
          >
            Aceptar
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case "inicio":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-700/50">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
              Bienvenido, <span className="text-cyan-400">{username}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-600/50 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                  <FiBox className="mr-2" /> Inventario
                </h3>
                <p className="text-3xl font-bold text-white">{products.length}</p>
                <p className="text-gray-400">Productos registrados</p>
                <p className="text-gray-400">Stock total: {totalStock}</p>
                <button
                  onClick={() => setActiveSection("inventario")}
                  className="text-cyan-400 hover:underline text-sm mt-2"
                >
                  Ver inventario
                </button>
              </div>
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-600/50 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                  <FiDollarSign className="mr-2" /> Ganancias
                </h3>
                {balanceLoading ? (
                  <div className="animate-pulse text-gray-400">Cargando...</div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-white">S/ {totalEarnings.toFixed(2)}</p>
                    <p className="text-gray-400">{orders.length} ventas realizadas</p>
                    <p className="text-gray-400">Disponible: S/ {availableBalance.toFixed(2)}</p>
                    <button
                      onClick={() => setActiveSection("retiros")}
                      className="text-cyan-400 hover:underline text-sm mt-2"
                    >
                      Retirar fondos
                    </button>
                  </>
                )}
              </div>
              <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-600/50 shadow-lg">
                <h3 className="text-lg font-semibold text-cyan-400 mb-3 flex items-center">
                  <FiUser className="mr-2" /> Mi Cuenta
                </h3>
                <p className="text-lg font-medium text-white">{username}</p>
                <p className="text-sm text-gray-400 truncate">{email}</p>
                <p className="text-xs mt-2 bg-cyan-900 text-cyan-400 py-1 px-2 rounded-full inline-block">
                  {isAdmin ? "Administrador" : "Proveedor"}
                </p>
                <button
                  onClick={() => setActiveSection("configuracion")}
                  className="text-cyan-400 hover:underline text-sm mt-2"
                >
                  Editar perfil
                </button>
              </div>
            </div>
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-600/50">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <FiShoppingCart className="mr-2" /> Pedidos recientes
              </h3>
              {orders.length === 0 ? (
                <p className="text-gray-400 py-2 text-center">
                  No hay pedidos recientes.
                </p>
              ) : (
                orders.slice(0, 3).map((order, index) => (
                  <div key={index} className="border-b border-gray-600/50 py-3 last:border-0 hover:bg-gray-600/50 transition-all duration-300 rounded-xl px-2">
                    <div className="flex justify-between items-center">
                      <div className="w-2/3">
                        <p className="font-medium text-white truncate">{order.productName}</p>
                        <p className="text-sm text-gray-400 truncate">Comprador: {order.buyer}</p>
                      </div>
                      <div className="text-right w-1/3">
                        <p className="font-medium text-white">S/ {(order.amount || 0).toFixed(2)}</p>
                        <p className="text-sm text-gray-400">{formatDate(order.date)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {orders.length > 3 && (
                <button
                  onClick={() => setActiveSection("pedidos")}
                  className="w-full mt-3 text-center text-cyan-400 hover:underline text-sm"
                >
                  Ver todos los pedidos
                </button>
              )}
            </div>
          </div>
        );

      case "inventario":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center">
                <FiBox className="mr-2" /> Inventario
              </h3>
              <button
                onClick={() => setActiveSection("subirProducto")}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl flex items-center w-full md:w-auto justify-center transition-all duration-300"
              >
                <FiPlus className="mr-2" /> Nuevo Producto
              </button>
            </div>
            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600/50">
                  <thead className="bg-gray-700/50 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Producto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/50 divide-y divide-gray-600/50">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-700/50 transition-all duration-300">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {product.image && (
                              <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-full object-cover" src={product.image} alt={product.name} />
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white truncate max-w-xs">{product.name}</div>
                              <div className="text-xs text-gray-400">{getCategoryDisplayName(product.category)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">S/ {(parseFloat(product.price) || 0).toFixed(2)}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{product.stock || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              product.status === "En stock" ? "bg-green-900/80 text-green-400" : "bg-yellow-900/80 text-yellow-400"
                            }`}
                          >
                            {product.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-cyan-400 hover:text-cyan-500 mr-3"
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-400 hover:text-red-500"
                            title="Eliminar"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <FiBox className="mx-auto text-4xl text-gray-400 mb-3" />
                <h4 className="text-lg font-medium text-gray-300">No tienes productos registrados</h4>
                <p className="text-gray-400">Agrega tu primer producto para comenzar</p>
                <button
                  onClick={() => setActiveSection("subirProducto")}
                  className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl flex items-center mx-auto transition-all duration-300"
                >
                  <FiPlus className="mr-2" /> Agregar Producto
                </button>
              </div>
            )}
          </div>
        );

      case "subirProducto":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-4xl mx-auto border border-gray-700/50">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
              <FiUpload className="mr-2" /> Subir Nuevo Producto
            </h3>
            {error && (
              <div className="bg-red-900/80 border-l-4 border-red-500 p-4 mb-6 rounded-xl">
                <div className="flex">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-gray-300 mb-2">Imagen del producto</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600/50 border-dashed rounded-xl bg-gray-700/50 backdrop-blur-sm">
                    {product.image ? (
                      <div className="relative">
                        <img src={product.image} alt="Preview" className="mx-auto h-48 w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setProduct({ ...product, image: "" })}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-400 justify-center">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-gray-800/50 rounded-xl font-medium text-cyan-400 hover:text-cyan-500 focus-within:outline-none"
                          >
                            <span>Subir una imagen</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleFileChange(e)}
                              accept="image/*"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-1 space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Nombre del producto*</label>
                    <input
                      type="text"
                      name="name"
                      value={product.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                      placeholder="Ej: Netflix Premium 1 mes"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Categoría*</label>
                      <select
                        name="category"
                        value={product.category}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="Netflix">Netflix</option>
                        <option value="Spotify">Spotify</option>
                        <option value="Disney">Disney+</option>
                        <option value="Max">Max</option>
                        <option value="Prime Video">Prime Video</option>
                        <option value="Vix">Vix</option>
                        <option value="Crunchyroll">Crunchyroll</option>
                        <option value="Canva">Canva</option>
                        <option value="ChatGPT">ChatGPT</option>
                        <option value="Redes Sociales">Redes Sociales</option>
                        <option value="Dgo">DGO</option>
                        <option value="Liga Max">Liga Max</option>
                        <option value="Movistar Play">Movistar Play</option>
                        <option value="Youtube">YouTube</option>
                        <option value="Deezer">Deezer</option>
                        <option value="Tidal">Tidal</option>
                        <option value="Vpn">VPN</option>
                        <option value="WinTv">WinTV</option>
                        <option value="Apple Music">Apple Music</option>
                        <option value="Apple Tv">Apple TV</option>
                        <option value="Iptv">IPTV</option>
                        <option value="Flujo Tv">Flujo TV</option>
                        <option value="Viki Rakuten">Viki Rakuten</option>
                        <option value="Pornhub">Pornhub</option>
                        <option value="Paramount">Paramount</option>
                        <option value="Licencias">Licencias</option>
                        <option value="Capcut">Capcut</option>
                        <option value="Duolingo">Duolingo</option>
                        <option value="BuscaPersonas">BuscaPersonas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Tipo de cuenta*</label>
                      <select
                        name="accountType"
                        value={product.accountType}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="Premium">Premium</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Estado*</label>
                      <select
                        name="status"
                        value={product.status}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="En stock">En stock</option>
                        <option value="A pedido">A pedido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Stock*</label>
                      <input
                        type="number"
                        name="stock"
                        value={product.stock}
                        onChange={handleStockChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Precio (S/)*</label>
                      <input
                        type="number"
                        name="price"
                        value={product.price}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                        placeholder="Ej: 9.99"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="renewal"
                        checked={product.renewal}
                        onChange={handleChange}
                        className="h-4 w-4 text-cyan-400 focus:ring cyan-400 border-gray-600/50 rounded"
                      />
                      <label className="ml-2 text-gray-300">¿Tiene renovación?</label>
                    </div>
                  </div>
                  {product.renewal && (
                    <div>
                      <label className="block text-gray-300 mb-2">Precio de renovación (S/)*</label>
                      <input
                        type="number"
                        name="renewalPrice"
                        value={product.renewalPrice}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                        placeholder="Ej: 8.99"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">Duración (días)</label>
                  <input
                    type="number"
                    name="duration"
                    value={product.duration}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                    placeholder="Dejar vacío para ilimitado"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Teléfono de contacto {product.status === "A pedido" ? "*" : ""}</label>
                  <input
                    type="text"
                    name="providerPhone"
                    value={product.providerPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                    placeholder="Ej: +51 987654321"
                    required={product.status === "A pedido"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Detalles del producto</label>
                <textarea
                  name="details"
                  value={product.details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                  placeholder="Describe los detalles y características del producto"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Términos y condiciones</label>
                <textarea
                  name="terms"
                  value={product.terms}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                  placeholder="Especifica los términos y condiciones de uso"
                ></textarea>
              </div>
              {product.status === "En stock" && (
                <div>
                  <label className="block text-gray-300 mb-2">Cuentas asociadas*</label>
                  <p className="text-xs text-gray-400 mb-3">Debe completar todas las cuentas según el stock indicado</p>
                  <div className="space-y-4">
                    {product.accounts.map((account, index) => (
                      <div key={index} className="border border-gray-600/50 rounded-xl p-4 bg-gray-700/50 backdrop-blur-sm">
                        <h4 className="text-sm font-medium text-white mb-3">Cuenta {index + 1}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Correo electrónico*</label>
                            <input
                              type="email"
                              value={account.email}
                              onChange={(e) => handleAccountFieldChange(index, "email", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña*</label>
                            <input
                              type="text"
                              value={account.password}
                              onChange={(e) => handleAccountFieldChange(index, "password", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Perfil (opcional)</label>
                            <input
                              type="text"
                              value={account.profile}
                              onChange={(e) => handleAccountFieldChange(index, "profile", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              placeholder="Ej: Perfil 1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">PIN (opcional)</label>
                            <input
                              type="text"
                              value={account.pin}
                              onChange={(e) => handleAccountFieldChange(index, "pin", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              placeholder="Ej: 1234"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setActiveSection("inventario")}
                  className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-300"
                >
                  Subir Producto
                </button>
              </div>
            </div>
          </div>
        );

      case "ganancias":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-700/50">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
              <FiDollarSign className="mr-2" /> Ganancias
            </h3>
            <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-gray-600/50 shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h4 className="text-lg font-medium text-white mb-1">Ganancias totales</h4>
                  <p className="text-sm text-gray-400">{orders.length} ventas realizadas</p>
                  <p className="text-sm text-gray-400">Retirado: S/ {totalWithdrawn.toFixed(2)}</p>
                  <p className="text-sm text-gray-400">Disponible: S/ {availableBalance.toFixed(2)}</p>
                </div>
                <div className="text-3xl font-bold text-white mt-2 md:mt-0">S/ {totalEarnings.toFixed(2)}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-600/50">
                <thead className="bg-gray-700/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Comprador</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/50 divide-y divide-gray-600/50">
                  {orders.map((order, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 transition-all duration-300">
                      <td className="px-4 py-4 whitespace-nowrap text-white">{order.productName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{getCategoryDisplayName(order.category)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{order.buyer}</div>
                        <div className="text-xs text-gray-400">{order.buyerEmail}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{order.buyerPhone}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(order.date)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-white">S/ {(order.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900/80 text-green-400"
                        >
                          Completado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto text-4xl text-gray-400 mb-3" />
                <h4 className="text-lg font-medium text-gray-300">No hay ventas registradas</h4>
                <p className="text-gray-400">
                  Tus ventas aparecerán aquí.
                </p>
              </div>
            )}
          </div>
        );

        case "pedidos":
          return (
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-700/50">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
                <FiShoppingCart className="mr-2" /> Pedidos
              </h3>
              {orders.length > 0 ? (
                <div className="space-y-6">
                  {orders.map((order, index) => {
                    const isOnDemand = order.status === "pending";
                    const statusIcon = isOnDemand
                      ? <FiClock className="text-yellow-400" />
                      : <FiCheckCircle className="text-green-400" />;
                    return (
                      <div key={index} className="border border-gray-600/50 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                        <div className="bg-gray-700/50 backdrop-blur-sm px-4 py-3 border-b border-gray-600/50 flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            {statusIcon}
                            <div>
                              <h4 className="font-semibold text-white">{order.productName}</h4>
                              <p className="text-xs text-gray-400">Categoría: {getCategoryDisplayName(order.category)}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center space-x-2">
                            <p className="text-sm font-medium text-white">S/ {(order.amount || 0).toFixed(2)}</p>
                            <p className="text-xs text-gray-400">{formatDate(order.date)}</p>
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="text-cyan-400 hover:text-cyan-500"
                              title="Editar cuenta"
                            >
                              <FiEdit2 />
                            </button>
                            {/* Agregar botón Activar Pedido aquí */}
                            {order.status === "pending" && (
                              <button
                                onClick={() => handleActivateOrder(order.id)}
                                className="text-green-400 hover:text-green-500"
                                title="Activar pedido"
                              >
                                <FiCheck />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div className="bg-gray-700/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-600/50">
                              <h5 className="text-sm font-medium text-cyan-400 mb-3 flex items-center">
                                <FiUser className="mr-2" /> Información del Comprador
                              </h5>
                              <div className="space-y-2 text-gray-300">
                                <p>
                                  <span className="font-medium text-gray-400">Nombre:</span> 
                                  <span className="block text-white">{order.buyer}</span>
                                </p>
                                <p>
                                  <span className="font-medium text-gray-400">Email:</span> 
                                  <span className="block text-white">{order.buyerEmail}</span>
                                </p>
                                <p>
                                  <span className="font-medium text-gray-400">Teléfono:</span> 
                                  <span className="block text-white">{order.buyerPhone}</span>
                                </p>
                              </div>
                            </div>
                            <div className="bg-gray-700/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-600/50">
                              <h5 className="text-sm font-medium text-cyan-400 mb-3 flex items-center">
                                <FiUser className="mr-2" /> Detalles de la Cuenta
                              </h5>
                              <div className="space-y-2 text-gray-300">
                                {order.accountDetails ? (
                                  <>
                                    <p>
                                      <span className="font-medium text-gray-400">Email:</span> 
                                      <span className="block text-white break-all">{order.accountDetails.email}</span>
                                    </p>
                                    <p>
                                      <span className="font-medium text-gray-400">Contraseña:</span> 
                                      <span className="block text-white break-all">{order.accountDetails.password}</span>
                                    </p>
                                    <p>
                                      <span className="font-medium text-gray-400">Perfil:</span> 
                                      <span className="block text-white">{order.accountDetails.profile || "N/A"}</span>
                                    </p>
                                    <p>
                                      <span className="font-medium text-gray-400">PIN:</span> 
                                      <span className="block text-white">{order.accountDetails.pin || "N/A"}</span>
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-gray-400">No disponible</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FiShoppingCart className="mx-auto text-4xl text-gray-400 mb-3" />
                  <h4 className="text-lg font-medium text-gray-300">No hay pedidos registrados</h4>
                  <p className="text-gray-400">
                    Los pedidos de tus productos aparecerán aquí.
                  </p>
                </div>
              )}
            </div>
          );

      case "retiros":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-gray-700/50">
            {isAdmin ? (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
                  <FiCreditCard className="mr-2" /> Solicitudes de Retiro Pendientes
                </h3>
                {pendingWithdrawals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-600/50">
                      <thead className="bg-gray-700/50 backdrop-blur-sm">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Proveedor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Método</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Monto (S/)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800/50 divide-y divide-gray-600/50">
                        {pendingWithdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-700/50 transition-all duration-300">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white truncate max-w-xs">{withdrawal.provider}</div>
                              <div className="text-xs text-gray-400 truncate max-w-xs">{withdrawal.providerEmail}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{withdrawal.method}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">S/ {(withdrawal.amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(withdrawal.createdAt)}</td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={() => handleWithdrawAction(withdrawal.id, "approved")}
                                  className="text-green-400 hover:text-green-500 flex items-center text-sm"
                                >
                                  <FiCheck className="mr-1" /> Aprobar
                                </button>
                                <button
                                  onClick={() => handleWithdrawAction(withdrawal.id, "rejected")}
                                  className="text-red-400 hover:text-red-500 flex items-center text-sm"
                                >
                                  <FiX className="mr-1" /> Rechazar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiCreditCard className="mx-auto text-4xl text-gray-400 mb-3" />
                    <h4 className="text-lg font-medium text-gray-300">No hay solicitudes pendientes</h4>
                    <p className="text-gray-400">Las solicitudes de retiro aparecerán aquí</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
                  <FiCreditCard className="mr-2" /> Retirar Dinero
                </h3>
                <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 mb-6 border border-gray-600/50 shadow-lg">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <div>
                      <h4 className="text-lg font-medium text-white mb-1">Saldo disponible</h4>
                      <p className="text-sm text-gray-400">Ganancias totales: S/ {totalEarnings.toFixed(2)}</p>
                      <p className="text-sm text-gray-400">Retirado: S/ {totalWithdrawn.toFixed(2)}</p>
                    </div>
                    <div className="text-3xl font-bold text-white mt-2 md:mt-0">S/ {availableBalance.toFixed(2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-600/50">
                    <h4 className="text-lg font-medium text-white mb-4">Solicitar Retiro</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-gray-300 mb-2">Monto a retirar (S/)*</label>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                          placeholder="Ej: 150.00"
                          step="0.01"
                          min="0"
                          max={availableBalance}
                        />
                        <p className="text-xs text-gray-400 mt-1">Máximo disponible: S/ {availableBalance.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Método de pago*</label>
                        <select
                          value={withdrawMethod}
                          onChange={(e) => setWithdrawMethod(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                        >
                          <option value="Yape">Yape</option>
                          <option value="Plin">Plin</option>
                          <option value="Transferencia">Transferencia Bancaria</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 mb-2">Datos de la cuenta*</label>
                        <input
                          type="text"
                          value={withdrawAccount}
                          onChange={(e) => setWithdrawAccount(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                          placeholder={withdrawMethod === "Yape" ? "Número de teléfono" : "Número de cuenta"}
                          required
                        />
                      </div>
                      <button
                        onClick={handleWithdrawRequest}
                        disabled={
                          !withdrawAmount ||
                          parseFloat(withdrawAmount) <= 0 ||
                          parseFloat(withdrawAmount) > availableBalance ||
                          !withdrawAccount
                        }
                        className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                          withdrawAmount && parseFloat(withdrawAmount) > 0 && parseFloat(withdrawAmount) <= availableBalance && withdrawAccount
                            ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Solicitar Retiro
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-700/50 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-gray-600/50">
                    <h4 className="text-lg font-medium text-white mb-4">Historial de Retiros</h4>
                    {withdrawals.length > 0 ? (
                      <div className="space-y-4">
                        {withdrawals.map((withdrawal, index) => (
                          <div key={index} className="border-b border-gray-600/50 py-3 last:border-0 hover:bg-gray-600/50 transition-all duration-300 rounded-xl px-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-white">S/ {(withdrawal.amount || 0).toFixed(2)}</p>
                                <p className="text-sm text-gray-400">{withdrawal.method} - {withdrawal.account}</p>
                                <p className="text-xs text-gray-400">
                                  {withdrawal.status === "pending" ? "Solicitado" : "Procesado"}: {formatDate(withdrawal.status === "pending" ? withdrawal.createdAt : withdrawal.processedAt)}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                                  withdrawal.status === "approved"
                                    ? "bg-green-900/80 text-green-400"
                                    : withdrawal.status === "rejected"
                                    ? "bg-red-900/80 text-red-400"
                                    : "bg-yellow-900/80 text-yellow-400"
                                }`}
                              >
                                {withdrawal.status === "approved" ? "Aprobado" : withdrawal.status === "rejected" ? "Rechazado" : "Pendiente"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiCreditCard className="mx-auto text-3xl text-gray-400 mb-2" />
                        <p className="text-gray-400">No hay retiros registrados</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "configuracion":
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-xl max-w-2xl mx-auto border border-gray-700/50">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center">
              <FiSettings className="mr-2" /> Configuración de cuenta
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Nombre de usuario</label>
                <input
                  type="text"
                  value={username}
                  disabled
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 transition-all cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Correo electrónico</label>
                <input
                  type="email"
                  name="email"
                  value={accountDetails.email}
                  disabled
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 transition-all cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Nueva contraseña</label>
                <input
                  type="password"
                  name="password"
                  value={accountDetails.password}
                  onChange={handleAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Preferencias</label>
                <textarea
                  name="preferences"
                  value={accountDetails.preferences}
                  onChange={handleAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                  placeholder="Escribe tus preferencias o notas"
                  rows="4"
                ></textarea>
              </div>
              {error && (
                <div className="bg-red-900/80 border-l-4 border-red-500 p-4 rounded-xl">
                  <div className="flex">
                    <FiAlertCircle className="h-5 w-5 text-red-400" />
                    <p className="ml-3 text-sm text-red-300">{error}</p>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleUpdateAccount}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-300"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const menuItems = [
    { id: "inicio", label: "Inicio", icon: <FiHome /> },
    { id: "inventario", label: "Inventario", icon: <FiBox /> },
    { id: "subirProducto", label: "Subir Producto", icon: <FiUpload /> },
    { id: "ganancias", label: "Ganancias", icon: <FiDollarSign /> },
    { id: "pedidos", label: "Pedidos", icon: <FiShoppingCart /> },
    { id: "retiros", label: "Retiros", icon: <FiCreditCard /> },
    { id: "configuracion", label: "Configuración", icon: <FiSettings /> },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800/50 backdrop-blur-sm transform ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-gray-700/50`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h1 className="text-xl font-bold text-cyan-400">Panel de Proveedor</h1>
            <button onClick={() => setMenuOpen(false)} className="md:hidden text-gray-300 hover:text-white">
              <FiClose size={24} />
            </button>
          </div>
          <nav className="mt-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  activeSection === item.id
                    ? "bg-cyan-500/20 text-cyan-400 border-l-4 border-cyan-400"
                    : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700/50 hover:text-white transition-all duration-300"
            >
              <FiLogOut className="mr-3" />
              Cerrar Sesión
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:ml-64">
          <header className="bg-gray-800/50 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-700/50">
            <button onClick={() => setMenuOpen(true)} className="md:hidden text-gray-300 hover:text-white">
              <FiMenu size={24} />
            </button>
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                <FiUser className="text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{username}</p>
                <p className="text-xs text-gray-400">{email}</p>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiEdit2 className="mr-2" /> Editar Producto
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-300 hover:text-white">
                <FiClose size={24} />
              </button>
            </div>
            {editError && (
              <div className="bg-red-900/80 border-l-4 border-red-500 p-4 mb-6 rounded-xl">
                <div className="flex">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-300">{editError}</p>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className="block text-gray-300 mb-2">Imagen del producto</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600/50 border-dashed rounded-xl bg-gray-700/50 backdrop-blur-sm">
                    {selectedProduct?.image ? (
                      <div className="relative">
                        <img src={selectedProduct.image} alt="Preview" className="mx-auto h-48 w-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setSelectedProduct({ ...selectedProduct, image: "" })}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-400 justify-center">
                          <label
                            htmlFor="edit-file-upload"
                            className="relative cursor-pointer bg-gray-800/50 rounded-xl font-medium text-cyan-400 hover:text-cyan-500 focus-within:outline-none"
                          >
                            <span>Subir una imagen</span>
                            <input
                              id="edit-file-upload"
                              name="edit-file-upload"
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleFileChange(e, true)}
                              accept="image/*"
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-1 space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Nombre del producto*</label>
                    <input
                      type="text"
                      name="name"
                      value={selectedProduct?.name || ""}
                      onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                      placeholder="Ej: Netflix Premium 1 mes"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Categoría*</label>
                      <select
                        name="category"
                        value={selectedProduct?.category || "Netflix"}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="Netflix">Netflix</option>
                        <option value="Spotify">Spotify</option>
                        <option value="Disney">Disney+</option>
                        <option value="Max">Max</option>
                        <option value="Prime Video">Prime Video</option>
                        <option value="Vix">Vix</option>
                        <option value="Crunchyroll">Crunchyroll</option>
                        <option value="Canva">Canva</option>
                        <option value="ChatGPT">ChatGPT</option>
                        <option value="Redes Sociales">Redes Sociales</option>
                        <option value="Dgo">DGO</option>
                        <option value="Liga Max">Liga Max</option>
                        <option value="Movistar Play">Movistar Play</option>
                        <option value="Youtube">YouTube</option>
                        <option value="Deezer">Deezer</option>
                        <option value="Tidal">Tidal</option>
                        <option value="Vpn">VPN</option>
                        <option value="WinTv">WinTV</option>
                        <option value="Apple Music">Apple Music</option>
                        <option value="Apple Tv">Apple TV</option>
                        <option value="Iptv">IPTV</option>
                        <option value="Flujo Tv">Flujo TV</option>
                        <option value="Viki Rakuten">Viki Rakuten</option>
                        <option value="Pornhub">Pornhub</option>
                        <option value="Paramount">Paramount</option>
                        <option value="Licencias">Licencias</option>
                        <option value="Capcut">Capcut</option>
                        <option value="Duolingo">Duolingo</option>
                        <option value="BuscaPersonas">BuscaPersonas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Tipo de cuenta*</label>
                      <select
                        name="accountType"
                        value={selectedProduct?.accountType || "Premium"}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, accountType: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="Premium">Premium</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Estado*</label>
                      <select
                        name="status"
                        value={selectedProduct?.status || "En stock"}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, status: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                      >
                        <option value="En stock">En stock</option>
                        <option value="A pedido">A pedido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Stock*</label>
                      <input
                        type="number"
                        name="stock"
                        value={selectedProduct?.stock || 1}
                        onChange={handleEditStockChange}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Precio (S/)*</label>
                      <input
                        type="number"
                        name="price"
                        value={selectedProduct?.price || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, price: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                        placeholder="Ej: 9.99"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="renewal"
                        checked={selectedProduct?.renewal || false}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, renewal: e.target.checked })}
                        className="h-4 w-4 text-cyan-400 focus:ring cyan-400 border-gray-600/50 rounded"
                      />
                      <label className="ml-2 text-gray-300">¿Tiene renovación?</label>
                    </div>
                  </div>
                  {selectedProduct?.renewal && (
                    <div>
                      <label className="block text-gray-300 mb-2">Precio de renovación (S/)*</label>
                      <input
                        type="number"
                        name="renewalPrice"
                        value={selectedProduct?.renewalPrice || ""}
                        onChange={(e) => setSelectedProduct({ ...selectedProduct, renewalPrice: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                        placeholder="Ej: 8.99"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">Duración (días)</label>
                  <input
                    type="number"
                    name="duration"
                    value={selectedProduct?.duration || ""}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, duration: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                    placeholder="Dejar vacío para ilimitado"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Teléfono de contacto {selectedProduct?.status === "A pedido" ? "*" : ""}</label>
                  <input
                    type="text"
                    name="providerPhone"
                    value={selectedProduct?.providerPhone || ""}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, providerPhone: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                    placeholder="Ej: +51 987654321"
                    required={selectedProduct?.status === "A pedido"}
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Detalles del producto</label>
                <textarea
                  name="details"
                  value={selectedProduct?.details || ""}
                  onChange={(e) => setSelectedProduct({ ...selectedProduct, details: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                  placeholder="Describe los detalles y características del producto"
                ></textarea>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Términos y condiciones</label>
                <textarea
                  name="terms"
                  value={selectedProduct?.terms || ""}
                  onChange={(e) => setSelectedProduct({ ...selectedProduct, terms: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-gray-500"
                  placeholder="Especifica los términos y condiciones de uso"
                ></textarea>
              </div>
              {selectedProduct?.status === "En stock" && (
                <div>
                  <label className="block text-gray-300 mb-2">Cuentas asociadas*</label>
                  <p className="text-xs text-gray-400 mb-3">Debe completar todas las cuentas según el stock indicado</p>
                  <div className="space-y-4">
                    {selectedProduct?.accounts?.map((account, index) => (
                      <div key={index} className="border border-gray-600/50 rounded-xl p-4 bg-gray-700/50 backdrop-blur-sm">
                        <h4 className="text-sm font-medium text-white mb-3">Cuenta {index + 1}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Correo electrónico*</label>
                            <input
                              type="email"
                              value={account.email}
                              onChange={(e) => handleEditAccountFieldChange(index, "email", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña*</label>
                            <input
                              type="text"
                              value={account.password}
                              onChange={(e) => handleEditAccountFieldChange(index, "password", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Perfil (opcional)</label>
                            <input
                              type="text"
                              value={account.profile}
                              onChange={(e) => handleEditAccountFieldChange(index, "profile", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              placeholder="Ej: Perfil 1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">PIN (opcional)</label>
                            <input
                              type="text"
                              value={account.pin}
                              onChange={(e) => handleEditAccountFieldChange(index, "pin", e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all text-sm"
                              placeholder="Ej: 1234"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateProduct}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-300"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <FiEdit2 className="mr-2" /> Editar Detalles de Cuenta
              </h3>
              <button onClick={() => setEditOrderModalOpen(false)} className="text-gray-300 hover:text-white">
                <FiClose size={24} />
              </button>
            </div>
            {editOrderError && (
              <div className="bg-red-900/80 border-l-4 border-red-500 p-4 mb-6 rounded-xl">
                <div className="flex">
                  <FiAlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-300">{editOrderError}</p>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Correo electrónico*</label>
                <input
                  type="email"
                  name="email"
                  value={selectedOrder?.accountDetails.email || ""}
                  onChange={handleOrderAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Contraseña*</label>
                <input
                  type="text"
                  name="password"
                  value={selectedOrder?.accountDetails.password || ""}
                  onChange={handleOrderAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Perfil (opcional)</label>
                <input
                  type="text"
                  name="profile"
                  value={selectedOrder?.accountDetails.profile || ""}
                  onChange={handleOrderAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  placeholder="Ej: Perfil 1"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">PIN (opcional)</label>
                <input
                  type="text"
                  name="pin"
                  value={selectedOrder?.accountDetails.pin || ""}
                  onChange={handleOrderAccountChange}
                  className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-white border border-gray-600/50 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                  placeholder="Ej: 1234"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setEditOrderModalOpen(false)}
                  className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateOrder}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-xl transition-all duration-300"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl max-w-md w-full mx-4 border border-gray-700/50">
            <div className="text-center">
              <FiCheckCircle className="mx-auto text-4xl text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">¡Éxito!</h3>
              <p className="text-gray-300 mb-4">{successModal.message}</p>
              <button
                onClick={() => setSuccessModal({ open: false, message: "" })}
                className="px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all duration-300"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardProvider;
