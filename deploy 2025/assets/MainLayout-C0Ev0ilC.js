const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/TimeClockModal-CG4Tqpz-.js","assets/index-B4F2XZYo.js","assets/landing-DMNKFuas.js","assets/vendor-DeEp8S9j.js","assets/supabase-vendor-DZiv2hl9.js","assets/index-k1dWmxkk.css","assets/inventoryCountService-Bo8nZII3.js","assets/SettingsIcon-DbPfflvT.js","assets/DashboardPage-h-fboQBj.js","assets/formatting-BolSclPB.js","assets/POSPage-CfsNRIk2.js","assets/SearchIcon-adFEEg0f.js","assets/ConfirmationModal-D0s46AqS.js","assets/ReportsPage-DYsZ0J96.js","assets/SaleDetailModal-DKc9AHtw.js","assets/DateRangePickerModal-C8t1skse.js","assets/AuthorizationModal-BKtBOwJR.js","assets/InventoryPage-Cd659UK0.js","assets/PlusIcon-Dp3X8gCD.js","assets/fileParser-CZ0ywuS-.js","assets/bunnyService-Bv6QdtJu.js","assets/CombosPage-CuObhsAv.js","assets/ProductPickerModal-BgJ2gb1c.js","assets/PromotionsPage-gLX2fNCD.js","assets/ClientsPage-Cflj8FVR.js","assets/ProvidersPage-DN08rZkv.js","assets/EmployeesPage-DhlyNDbk.js","assets/MarketingPage-BTJtzyhM.js","assets/CampaignCreatorModal-BktY079p.js","assets/AIClientSegmentation-BfAh_hDL.js","assets/QuotesPage-DOhy8eTr.js","assets/ClientSearchModal-CYGLdqnM.js","assets/ClientFormModal-CFrRxKaq.js","assets/FinancialsPage-vbzPr3bf.js","assets/PortfolioPage-j0dSZWPo.js","assets/AddonsPage-CNnHUZgK.js","assets/SettingsPage-CmlwmlGV.js","assets/LoadingSpinner-Ca-1SL1h.js","assets/CashRegisterReportsPage-BVJ5jH6J.js","assets/InventoryCountReportsPageContainer-C71br3lM.js","assets/PayrollPage-rgczXCV5.js","assets/TimeClockManagerPage-BqTysk50.js","assets/CommissionManagementPage-BdI6PW77.js","assets/AIChatWidget-CKRTjRkb.js"])))=>i.map(i=>d[i]);
import { s as supabase, c as createRoleService, a as createEmployeeService, b as subscribeToLocalStorage, d as setLocalStorageItem, g as getLocalStorageItem, u as useAuth, _ as __vitePreload, e as useNotification } from './index-B4F2XZYo.js';
import { b as reactExports, j as jsxRuntimeExports, u as useI18n, L as Logo, d as LanguageSwitcher, e as ThemeToggle, c as React, p as platformSettingsService } from './landing-DMNKFuas.js';
import { c as createInventoryCountService } from './inventoryCountService-Bo8nZII3.js';
import { S as SettingsIcon, D as DashboardIcon } from './SettingsIcon-DbPfflvT.js';

const productSelectQuery = `
    id, name, price, cost_price, stock,
    unit_of_measure, description, is_supply, image_url,
    fractional_enabled, fractional_unit_name, fractional_units_per_package, fractional_price,
    strict_combo_only,
    category:ryze_categories(id, name, parent_id)
`;
const buildCategoryPath = (categoryId, allCategories) => {
  if (!categoryId) return "";
  const category = allCategories.find((c) => c.id === categoryId);
  if (!category) return "";
  if (category.parent_id) {
    const parentPath = buildCategoryPath(category.parent_id, allCategories);
    return `${parentPath} / ${category.name}`;
  }
  return category.name;
};
const mapProductFromDb = (dbProduct, allCategories) => {
  const categoryInfo = dbProduct.category;
  const categoryId = categoryInfo ? categoryInfo.id : void 0;
  const categoryPath = categoryId ? buildCategoryPath(categoryId, allCategories) : "Sin categoría";
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    category: categoryPath,
    categoryId,
    price: dbProduct.price,
    costPrice: dbProduct.cost_price,
    stock: dbProduct.stock !== null ? Number(dbProduct.stock) : void 0,
    unitOfMeasure: dbProduct.unit_of_measure,
    description: dbProduct.description,
    isSupply: dbProduct.is_supply,
    imageUrl: dbProduct.image_url,
    basePrice: dbProduct.price,
    fractionalEnabled: dbProduct.fractional_enabled,
    fractionalUnitName: dbProduct.fractional_unit_name || void 0,
    fractionalUnitsPerPackage: dbProduct.fractional_units_per_package !== null ? Number(dbProduct.fractional_units_per_package) : void 0,
    fractionalPrice: dbProduct.fractional_price !== null ? Number(dbProduct.fractional_price) : void 0,
    strictComboOnly: dbProduct.strict_combo_only ?? false
  };
};
const mapProductToDb = (appProduct) => ({
  id: appProduct.id,
  name: appProduct.name,
  category_id: appProduct.categoryId && appProduct.categoryId.trim() !== "" ? appProduct.categoryId : null,
  price: appProduct.price,
  cost_price: appProduct.costPrice,
  stock: appProduct.stock,
  unit_of_measure: appProduct.unitOfMeasure,
  description: appProduct.description,
  is_supply: appProduct.isSupply,
  image_url: appProduct.imageUrl,
  organization_id: appProduct.organization_id,
  fractional_enabled: appProduct.fractionalEnabled ?? false,
  fractional_unit_name: appProduct.fractionalUnitName,
  fractional_units_per_package: appProduct.fractionalUnitsPerPackage,
  fractional_price: appProduct.fractionalPrice,
  strict_combo_only: appProduct.strictComboOnly ?? false
});
const createInventoryService = (orgId) => {
  let _categoriesCache = null;
  const fetchPriceVariants = async (productIds) => {
    if (productIds.length === 0) return {};
    const BATCH_SIZE = 100;
    const grouped = {};
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      try {
        const { data, error } = await supabase.from("price_list_entries").select("product_id, price, is_manual, price_list_id, price_list:price_lists(name)").eq("organization_id", orgId).in("product_id", batch);
        if (error) {
          console.error("Error fetching price variants batch:", error);
          continue;
        }
        (data || []).forEach((entry) => {
          if (!grouped[entry.product_id]) grouped[entry.product_id] = [];
          grouped[entry.product_id].push({
            priceListId: entry.price_list_id,
            priceListName: entry.price_list?.name || "Lista",
            price: Number(entry.price),
            isManual: entry.is_manual
          });
        });
      } catch (err) {
        console.error("Error in price variants batch:", err);
      }
    }
    return grouped;
  };
  const getCategoriesWithCache = async () => {
    if (_categoriesCache) {
      return _categoriesCache;
    }
    const { data, error } = await supabase.from("ryze_categories").select("id, name, parent_id").order("name");
    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
    _categoriesCache = data || [];
    return _categoriesCache;
  };
  const invalidateCache = () => {
    _categoriesCache = null;
  };
  return {
    searchInventory: async (query, categoryId) => {
      const allCategories = await getCategoriesWithCache();
      if (!query) {
        let supabaseQuery = supabase.from("ryze_products").select(productSelectQuery).limit(1e4);
        if (categoryId) {
          supabaseQuery = supabaseQuery.eq("category_id", categoryId);
        }
        const { data, error } = await supabaseQuery.order("name");
        if (error) throw error;
        const productList2 = data || [];
        const variantsByProduct2 = await fetchPriceVariants(productList2.map((p) => p.id));
        return productList2.map((p) => {
          const product = mapProductFromDb(p, allCategories);
          product.priceVariants = variantsByProduct2[product.id] || [];
          product.basePrice = product.price;
          return product;
        });
      }
      let startsWithQuery = supabase.from("ryze_products").select(productSelectQuery).or(`name.ilike.${query}%,id.ilike.${query}%`).limit(1e4);
      if (categoryId) {
        startsWithQuery = startsWithQuery.eq("category_id", categoryId);
      }
      const { data: startsWithData, error: startsWithError } = await startsWithQuery.order("name");
      if (startsWithError) {
        console.error("Error fetching inventory (starts with):", startsWithError);
        throw startsWithError;
      }
      let containsQuery = supabase.from("ryze_products").select(productSelectQuery).or(`name.ilike.%${query}%,id.ilike.%${query}%`).limit(1e4);
      if (categoryId) {
        containsQuery = containsQuery.eq("category_id", categoryId);
      }
      const { data: containsData, error: containsError } = await containsQuery.order("name");
      if (containsError) {
        console.error("Error fetching inventory (contains):", containsError);
        throw containsError;
      }
      const startsWithIds = new Set((startsWithData || []).map((p) => p.id));
      const containsFiltered = (containsData || []).filter((p) => !startsWithIds.has(p.id));
      const productList = [...startsWithData || [], ...containsFiltered];
      const variantsByProduct = await fetchPriceVariants(productList.map((p) => p.id));
      return productList.map((p) => {
        const product = mapProductFromDb(p, allCategories);
        product.priceVariants = variantsByProduct[product.id] || [];
        product.basePrice = product.price;
        return product;
      });
    },
    getProductRecipe: async (productId) => {
      const { data, error } = await supabase.from("product_recipes").select(`
                    id,
                    name,
                    yield_quantity,
                    components:product_recipe_components (
                        id,
                        component_product_id,
                        quantity,
                        unit,
                        extra_cost,
                        include_inventory
                    )
                `).eq("product_id", productId).eq("organization_id", orgId).maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching recipe:", error);
        throw error;
      }
      if (!data) return null;
      return {
        id: data.id,
        productId,
        name: data.name || void 0,
        yieldQuantity: data.yield_quantity || 1,
        components: (data.components || []).map((component) => ({
          id: component.id,
          componentProductId: component.component_product_id,
          quantity: Number(component.quantity) || 0,
          unit: component.unit || void 0,
          extraCost: component.extra_cost !== null ? Number(component.extra_cost) : void 0,
          includeInventory: component.include_inventory ?? true
        }))
      };
    },
    upsertProductRecipe: async (recipe) => {
      if (!recipe) {
        return;
      }
      const upsertPayload = {
        id: recipe.id,
        organization_id: orgId,
        product_id: recipe.productId,
        name: recipe.name,
        yield_quantity: recipe.yieldQuantity || 1
      };
      const { data, error } = await supabase.from("product_recipes").upsert(upsertPayload, { onConflict: "id" }).select("id").single();
      if (error) {
        console.error("Error upserting recipe:", error);
        throw error;
      }
      const recipeId = data.id;
      await supabase.from("product_recipe_components").delete().eq("recipe_id", recipeId);
      if (recipe.components && recipe.components.length > 0) {
        const componentsPayload = recipe.components.map((component) => ({
          id: component.id,
          recipe_id: recipeId,
          component_product_id: component.componentProductId,
          quantity: component.quantity,
          unit: component.unit,
          extra_cost: component.extraCost ?? 0,
          include_inventory: component.includeInventory ?? true,
          organization_id: orgId
        }));
        const { error: insertError } = await supabase.from("product_recipe_components").insert(componentsPayload);
        if (insertError) {
          console.error("Error upserting recipe components:", insertError);
          throw insertError;
        }
      }
    },
    deleteProductRecipe: async (productId) => {
      const { data, error } = await supabase.from("product_recipes").select("id").eq("product_id", productId).eq("organization_id", orgId);
      if (error) {
        console.error("Error fetching recipe for delete:", error);
        throw error;
      }
      const recipeIds = (data || []).map((record) => record.id);
      if (recipeIds.length === 0) return;
      await supabase.from("product_recipe_components").delete().in("recipe_id", recipeIds);
      await supabase.from("product_recipes").delete().in("id", recipeIds);
    },
    addProduct: async (productData) => {
      if (!productData.id || productData.id.trim() === "") {
        throw new Error("El ID del producto (SKU) es requerido y no puede estar vacío.");
      }
      const payload = { ...productData, organization_id: orgId };
      const allCategories = await getCategoriesWithCache();
      const { data, error } = await supabase.from("ryze_products").insert([mapProductToDb(payload)]).select(productSelectQuery).single();
      if (error) {
        console.error("Error adding product:", error);
        if (error.code === "23505") {
          throw new Error(`Un producto con el SKU "${productData.id}" ya existe.`);
        }
        throw error;
      }
      const product = mapProductFromDb(data, allCategories);
      product.priceVariants = [];
      return product;
    },
    updateProduct: async (productData) => {
      const { id, ...updateData } = productData;
      const allCategories = await getCategoriesWithCache();
      const { data, error } = await supabase.from("ryze_products").update(mapProductToDb(updateData)).eq("id", id).select(productSelectQuery).single();
      if (error) {
        console.error("Error updating product:", error);
        throw error;
      }
      const product = mapProductFromDb(data, allCategories);
      const variants = await fetchPriceVariants([product.id]);
      product.priceVariants = variants[product.id] || [];
      return product;
    },
    updateFractionalConfig: async (productId, config) => {
      const payload = {
        fractional_enabled: true,
        fractional_unit_name: config.fractionalUnitName,
        fractional_units_per_package: config.fractionalUnitsPerPackage
      };
      if (config.fractionalPrice !== void 0) {
        payload.fractional_price = config.fractionalPrice;
      }
      const { error } = await supabase.from("ryze_products").update(payload).eq("id", productId);
      if (error) {
        console.error("Error updating fractional configuration:", error);
        throw error;
      }
    },
    upsertProducts: async (products) => {
      const dbProducts = products.map((p) => mapProductToDb({ ...p, organization_id: orgId }));
      const allCategories = await getCategoriesWithCache();
      const { data, error } = await supabase.from("ryze_products").upsert(dbProducts, { onConflict: "id,organization_id" }).select(productSelectQuery);
      if (error) {
        console.error("Error upserting products:", error);
        throw error;
      }
      const result = data || [];
      const variantsByProduct = await fetchPriceVariants(result.map((p) => p.id));
      return result.map((p) => {
        const product = mapProductFromDb(p, allCategories);
        product.priceVariants = variantsByProduct[product.id] || [];
        return product;
      });
    },
    deleteProduct: async (productId) => {
      const { error } = await supabase.from("ryze_products").delete().eq("id", productId);
      if (error) {
        console.error("Error deleting product:", error);
        throw error;
      }
    },
    updateStock: async (stockUpdates) => {
      stockUpdates.map(
        (u) => supabase.rpc("update_stock", {
          p_product_id: u.productId,
          p_quantity_change: u.quantityChange
        })
      );
      for (const update of stockUpdates) {
        const { error } = await supabase.rpc("update_stock", {
          p_product_id: update.productId,
          p_quantity_change: update.quantityChange
        });
        if (error) {
          console.error(`Failed to update stock for ${update.productId}`, error);
        }
      }
    },
    getUniqueCategories: getCategoriesWithCache,
    updateCategoryName: async (categoryId, newName) => {
      invalidateCache();
      const { error } = await supabase.from("ryze_categories").update({ name: newName }).eq("id", categoryId);
      if (error) {
        console.error("Error updating category name:", error);
        throw error;
      }
    },
    createCategory: async (categoryName, parentId = null) => {
      invalidateCache();
      const { data, error } = await supabase.from("ryze_categories").insert({ name: categoryName, parent_id: parentId, organization_id: orgId }).select().single();
      if (error) {
        if (error.code === "23505") {
          throw new Error(`La categoría "${categoryName}" ya existe.`);
        }
        console.error("Error creating category:", error);
        throw error;
      }
      return data;
    },
    deleteCategory: async (categoryId) => {
      invalidateCache();
      const { error } = await supabase.from("ryze_categories").delete().eq("id", categoryId);
      if (error) throw error;
    },
    saveInventoryCount: async (reportData) => {
      const { data, error } = await supabase.from("ryze_inventory_counts").insert([{
        counted_by: reportData.countedBy,
        items: reportData.items,
        category: reportData.category,
        status: "pending_approval",
        organization_id: orgId
        // RLS FIX
      }]).select().single();
      if (error) {
        console.error("Error saving inventory count:", error);
        throw error;
      }
      return data;
    },
    getInventoryCounts: async () => {
      const { data, error } = await supabase.from("ryze_inventory_counts").select("*").order("date", { ascending: false });
      if (error) {
        console.error("Error fetching inventory counts:", error);
        throw error;
      }
      return data || [];
    }
  };
};

const mapSaleFromDb = (dbSale) => ({
  ...dbSale,
  date: new Date(dbSale.date),
  ticketNumber: dbSale.ticket_number,
  totalDiscount: dbSale.total_discount,
  cashRegisterSessionId: dbSale.cash_register_session_id,
  changeGiven: dbSale.change_given,
  employeeId: dbSale.employee_id,
  employeeName: dbSale.employee_name,
  clientId: dbSale.client_id,
  clientName: dbSale.client_name,
  originalTicketNumber: dbSale.original_ticket_number,
  pointsEarned: dbSale.points_earned,
  pointsRedeemed: dbSale.points_redeemed
});
const createSaleService = (orgId, commissionService, employeeService) => {
  const service = {
    saveSale: async (saleData) => {
      const { data, error } = await supabase.from("ryze_sales").insert({
        items: saleData.items,
        subtotal: saleData.subtotal,
        total_discount: saleData.totalDiscount,
        total: saleData.total,
        cash_register_session_id: saleData.cashRegisterSessionId,
        payments: saleData.payments,
        change_given: saleData.changeGiven,
        employee_id: saleData.employeeId,
        employee_name: saleData.employeeName,
        client_id: saleData.clientId,
        client_name: saleData.clientName,
        points_earned: saleData.pointsEarned,
        points_redeemed: saleData.pointsRedeemed,
        type: "sale",
        organization_id: orgId
        // RLS FIX
      }).select().single();
      if (error) throw error;
      const savedSale = mapSaleFromDb(data);
      try {
        const employee = await employeeService.findEmployeeById(savedSale.employeeId);
        if (employee) {
          await commissionService.calculateAndSaveCommissionsForSale(savedSale, employee);
        }
      } catch (commissionError) {
        console.error("Commission calculation failed for sale, but the sale was saved successfully.", commissionError);
      }
      return savedSale;
    },
    getSales: async () => {
      const { data, error } = await supabase.from("ryze_sales").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSaleFromDb);
    },
    getSalesForEmployeeInPeriod: async (employeeId, startDate, endDate) => {
      const { data, error } = await supabase.from("ryze_sales").select("*").eq("employee_id", employeeId).eq("type", "sale").gte("date", startDate.toISOString()).lte("date", endDate.toISOString());
      if (error) throw error;
      return (data || []).map(mapSaleFromDb);
    },
    findSaleByTicketNumber: async (ticketNumber) => {
      const { data, error } = await supabase.from("ryze_sales").select("*").eq("ticket_number", ticketNumber).eq("type", "sale").limit(1).single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data ? mapSaleFromDb(data) : null;
    },
    getBestSellingProducts: async (limit = 20) => {
      const thirtyDaysAgo = /* @__PURE__ */ new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase.from("ryze_sales").select("items").eq("type", "sale").eq("organization_id", orgId).gte("date", thirtyDaysAgo.toISOString());
      if (error) throw error;
      const productQuantities = /* @__PURE__ */ new Map();
      (data || []).forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const productId = item.productId || item.id;
            const quantity = item.quantity || 0;
            if (productId) {
              productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
              );
            }
          });
        }
      });
      return Array.from(productQuantities.entries()).map(([productId, totalQuantity]) => ({ productId, totalQuantity })).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, limit);
    },
    processReturn: async (returnData) => {
      const itemsWithNegativeQuantities = returnData.items.map((item) => ({
        ...item,
        quantity: -Math.abs(item.quantity)
      }));
      const cashPayment = returnData.payments.find((p) => p.method.startsWith("efectivo"));
      const newReturnPayload = {
        items: itemsWithNegativeQuantities,
        subtotal: -Math.abs(returnData.subtotal),
        total_discount: -Math.abs(returnData.totalDiscount),
        total: -Math.abs(returnData.total),
        cash_register_session_id: returnData.cashRegisterSessionId,
        payments: [{ method: cashPayment?.method || "efectivo", amount: -Math.abs(returnData.total) }],
        change_given: 0,
        employee_id: returnData.employeeId,
        employee_name: returnData.employeeName,
        original_ticket_number: returnData.originalTicketNumber,
        type: "return",
        organization_id: orgId
        // RLS FIX
      };
      const { data, error } = await supabase.from("ryze_sales").insert(newReturnPayload).select().single();
      if (error) throw error;
      return mapSaleFromDb(data);
    },
    updatePaymentMethod: async (saleId, newPaymentMethod) => {
      const { data: currentSale, error: fetchError } = await supabase.from("ryze_sales").select("*").eq("id", saleId).eq("organization_id", orgId).single();
      if (fetchError) throw fetchError;
      if (!currentSale) throw new Error("Venta no encontrada");
      const totalAmount = currentSale.total;
      const updatedPayments = [{ method: newPaymentMethod, amount: totalAmount }];
      const { data, error } = await supabase.from("ryze_sales").update({ payments: updatedPayments, change_given: 0 }).eq("id", saleId).eq("organization_id", orgId).select().single();
      if (error) throw error;
      return mapSaleFromDb(data);
    }
  };
  return service;
};

const mapCashRegisterSessionFromDb = (dbSession) => ({
  id: dbSession.id,
  startTime: new Date(dbSession.start_time),
  startAmount: dbSession.start_amount,
  endTime: dbSession.end_time ? new Date(dbSession.end_time) : void 0,
  countedAmount: dbSession.counted_amount,
  expectedInDrawer: dbSession.expected_in_drawer,
  difference: dbSession.difference,
  status: dbSession.status,
  employeeId: dbSession.employee_id,
  employeeName: dbSession.employee_name
});
const mapExpenseFromDb = (dbExpense) => ({
  id: dbExpense.id,
  date: new Date(dbExpense.date),
  description: dbExpense.description,
  amount: dbExpense.amount,
  paymentMethod: dbExpense.payment_method,
  employeeId: dbExpense.employee_id,
  employeeName: dbExpense.employee_name
});
const createCashRegisterService = (orgId, saleService) => {
  const service = {
    getActiveSessions: async () => {
      const { data, error } = await supabase.from("ryze_cash_register_sessions").select("*").eq("status", "open").eq("organization_id", orgId);
      if (error) throw error;
      return (data || []).map(mapCashRegisterSessionFromDb);
    },
    getActiveSessionsForEmployee: async (employeeId) => {
      const { data, error } = await supabase.from("ryze_cash_register_sessions").select("*").eq("employee_id", employeeId).eq("status", "open").eq("organization_id", orgId);
      if (error) throw error;
      return (data || []).map(mapCashRegisterSessionFromDb);
    },
    getAllSessions: async () => {
      const { data, error } = await supabase.from("ryze_cash_register_sessions").select("*").eq("organization_id", orgId).order("start_time", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapCashRegisterSessionFromDb);
    },
    createSession: async (startAmount, employeeId, employeeName) => {
      const { data: existing } = await supabase.from("ryze_cash_register_sessions").select("id").eq("employee_id", employeeId).eq("status", "open").eq("organization_id", orgId).limit(1).maybeSingle();
      if (existing) {
        throw new Error("SESSION_ALREADY_OPEN");
      }
      const { data, error } = await supabase.from("ryze_cash_register_sessions").insert({
        start_amount: startAmount,
        employee_id: employeeId,
        employee_name: employeeName,
        organization_id: orgId,
        status: "open"
      }).select().single();
      if (error) throw error;
      return mapCashRegisterSessionFromDb(data);
    },
    closeSession: async (sessionId, countedAmount) => {
      const details = await service.getSessionDetails(sessionId);
      const difference = countedAmount - details.expectedInDrawer;
      const { data, error } = await supabase.from("ryze_cash_register_sessions").update({
        status: "closed",
        end_time: (/* @__PURE__ */ new Date()).toISOString(),
        counted_amount: countedAmount,
        expected_in_drawer: details.expectedInDrawer,
        difference
      }).eq("id", sessionId).select().single();
      if (error) throw error;
      return mapCashRegisterSessionFromDb(data);
    },
    addCashMovement: async (sessionId, type, amount, reason, employeeId, employeeName) => {
      const { data, error } = await supabase.from("ryze_cash_movements").insert({
        session_id: sessionId,
        type,
        amount,
        reason,
        employee_id: employeeId,
        employee_name: employeeName,
        organization_id: orgId
        // RLS FIX
      }).select().single();
      if (error) throw error;
      return { ...data, date: new Date(data.date) };
    },
    getFullSessionDetails: async (sessionId) => {
      const [salesRes, movementsRes] = await Promise.all([
        supabase.from("ryze_sales").select("*").eq("cash_register_session_id", sessionId),
        supabase.from("ryze_cash_movements").select("*").eq("session_id", sessionId)
      ]);
      if (salesRes.error) throw salesRes.error;
      if (movementsRes.error) throw movementsRes.error;
      return {
        sales: (salesRes.data || []).map((s) => ({ ...s, date: new Date(s.date) })),
        movements: (movementsRes.data || []).map((m) => ({ ...m, date: new Date(m.date) }))
      };
    },
    getSessionDetails: async (sessionId) => {
      const { data, error } = await supabase.rpc("get_session_details", { p_session_id: sessionId });
      if (error) throw error;
      const summary = data && data.length > 0 ? data[0] : null;
      if (!summary) {
        return {
          startAmount: 0,
          netCashSales: 0,
          cashReturns: 0,
          ingresos: 0,
          egresos: 0,
          expectedInDrawer: 0
        };
      }
      return {
        startAmount: summary.start_amount,
        netCashSales: summary.net_cash_sales,
        cashReturns: summary.cash_returns,
        ingresos: summary.ingresos,
        egresos: summary.egresos,
        expectedInDrawer: summary.expected_in_drawer
      };
    }
  };
  return service;
};
const createExpenseService = (orgId) => {
  return {
    getAllExpenses: async () => {
      const { data, error } = await supabase.from("ryze_expenses").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapExpenseFromDb);
    },
    addExpense: async (expenseData) => {
      const { data, error } = await supabase.from("ryze_expenses").insert({
        date: expenseData.date,
        description: expenseData.description,
        amount: expenseData.amount,
        payment_method: expenseData.paymentMethod,
        employee_id: expenseData.employeeId,
        employee_name: expenseData.employeeName,
        organization_id: orgId
      }).select().single();
      if (error) throw error;
      return mapExpenseFromDb(data);
    },
    updateExpense: async (expenseData) => {
      const { id, ...updateData } = expenseData;
      const { data, error } = await supabase.from("ryze_expenses").update({
        date: updateData.date,
        description: updateData.description,
        amount: updateData.amount,
        payment_method: updateData.paymentMethod,
        employee_id: updateData.employeeId,
        employee_name: updateData.employeeName
      }).eq("id", id).select().single();
      if (error) throw error;
      return mapExpenseFromDb(data);
    },
    deleteExpense: async (expenseId) => {
      const { error } = await supabase.from("ryze_expenses").delete().eq("id", expenseId);
      if (error) throw error;
    }
  };
};

const mapClientFromDb = (dbClient) => ({
  ...dbClient,
  discountPercentage: dbClient.discount_percentage,
  loyaltyPoints: dbClient.loyalty_points,
  priceListId: dbClient.price_list_id || void 0
});
const createClientService = (orgId) => {
  return {
    getAllClients: async () => {
      const { data, error } = await supabase.from("ryze_clients").select("*");
      if (error) throw error;
      return (data || []).map(mapClientFromDb);
    },
    searchClients: async (query) => {
      let supabaseQuery = supabase.from("ryze_clients").select("*");
      if (query) {
        supabaseQuery = supabaseQuery.ilike("name", `%${query}%`);
      }
      const { data, error } = await supabaseQuery.order("name");
      if (error) throw error;
      return (data || []).map(mapClientFromDb);
    },
    addClient: async (clientData) => {
      const { data, error } = await supabase.from("ryze_clients").insert({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        discount_percentage: clientData.discountPercentage,
        price_list_id: clientData.priceListId || null,
        organization_id: orgId
        // RLS FIX
      }).select().single();
      if (error) throw error;
      return mapClientFromDb(data);
    },
    updateClient: async (clientData) => {
      const { id, ...updateData } = clientData;
      const { data, error } = await supabase.from("ryze_clients").update({
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        discount_percentage: updateData.discountPercentage,
        loyalty_points: updateData.loyaltyPoints,
        price_list_id: updateData.priceListId || null
      }).eq("id", id).select().single();
      if (error) throw error;
      return mapClientFromDb(data);
    },
    deleteClient: async (clientId) => {
      const { error } = await supabase.from("ryze_clients").delete().eq("id", clientId);
      if (error) throw error;
    },
    // FIX: Add missing 'addClientPayment' method to handle client debt payments.
    // This method calls an RPC function to ensure atomicity of payment logging and debt update.
    addClientPayment: async (paymentData) => {
      const { error } = await supabase.rpc("add_client_payment_and_update_debt", {
        p_client_id: paymentData.client_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_notes: paymentData.notes,
        p_employee_id: paymentData.employee_id,
        p_employee_name: paymentData.employee_name,
        p_organization_id: orgId
      });
      if (error) throw error;
    },
    addPoints: async (clientId, pointsToAdd) => {
      const { data, error } = await supabase.rpc("add_loyalty_points", {
        p_client_id: clientId,
        p_points_to_add: pointsToAdd
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to add points or client not found.");
      return mapClientFromDb(data[0]);
    },
    redeemPoints: async (clientId, pointsToRedeem) => {
      const { data, error } = await supabase.rpc("redeem_loyalty_points", {
        p_client_id: clientId,
        p_points_to_redeem: pointsToRedeem
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Failed to redeem points or client not found.");
      return mapClientFromDb(data[0]);
    },
    getLoyaltyLogs: async (clientId) => {
      const { data, error } = await supabase.from("ryze_loyalty_logs").select("*").eq("client_id", clientId).order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map((log) => ({ ...log, date: new Date(log.date) }));
    }
  };
};

const mapProviderFromDb = (dbProvider) => ({
  id: dbProvider.id,
  name: dbProvider.name,
  contactPerson: dbProvider.contact_person ?? void 0,
  phone: dbProvider.phone ?? void 0,
  email: dbProvider.email ?? void 0,
  address: dbProvider.address ?? void 0,
  creditDays: dbProvider.credit_days ?? void 0,
  vendorReferenceId: dbProvider.vendor_reference_id ?? void 0
});
const createProviderService = (orgId) => {
  return {
    searchProviders: async (query) => {
      let queryBuilder = supabase.from("ryze_providers").select("*");
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,contact_person.ilike.%${query}%`);
      }
      const { data, error } = await queryBuilder.order("name");
      if (error) throw error;
      return (data || []).map(mapProviderFromDb);
    },
    addProvider: async (providerData) => {
      const { data, error } = await supabase.from("ryze_providers").insert({
        name: providerData.name,
        contact_person: providerData.contactPerson,
        phone: providerData.phone,
        email: providerData.email,
        address: providerData.address,
        credit_days: providerData.creditDays ?? null,
        vendor_reference_id: providerData.vendorReferenceId ?? null,
        organization_id: orgId
        // RLS FIX: Add organization_id
      }).select().single();
      if (error) throw error;
      return mapProviderFromDb(data);
    },
    updateProvider: async (providerData) => {
      const { id, ...updateData } = providerData;
      const { data, error } = await supabase.from("ryze_providers").update({
        name: updateData.name,
        contact_person: updateData.contactPerson,
        phone: updateData.phone,
        email: updateData.email,
        address: updateData.address,
        credit_days: updateData.creditDays ?? null,
        vendor_reference_id: updateData.vendorReferenceId ?? null
      }).eq("id", id).select().single();
      if (error) throw error;
      return mapProviderFromDb(data);
    },
    deleteProvider: async (providerId) => {
      const { error } = await supabase.from("ryze_providers").delete().eq("id", providerId);
      if (error) throw error;
    },
    getAllProviders: async () => {
      const { data, error } = await supabase.from("ryze_providers").select("*").order("name");
      if (error) throw error;
      return (data || []).map(mapProviderFromDb);
    },
    getProviderCatalog: async (providerId) => {
      const { data, error } = await supabase.from("provider_products").select("id, vendor_sku, vendor_description, product_id, product:ryze_products(name)").eq("organization_id", orgId).eq("provider_id", providerId).order("vendor_sku");
      if (error) throw error;
      return (data || []).map((entry) => ({
        id: entry.id,
        providerId,
        vendorSku: entry.vendor_sku,
        vendorDescription: entry.vendor_description || void 0,
        productId: entry.product_id,
        productName: entry.product?.name
      }));
    },
    upsertProviderCatalog: async (providerId, rows) => {
      if (!rows || rows.length === 0) return;
      const payload = rows.map((row) => ({
        id: row.id,
        provider_id: providerId,
        organization_id: orgId,
        vendor_sku: row.vendorSku,
        vendor_description: row.vendorDescription,
        product_id: row.productId
      }));
      const { error } = await supabase.from("provider_products").upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    deleteProviderCatalogEntry: async (entryId) => {
      const { error } = await supabase.from("provider_products").delete().eq("id", entryId).eq("organization_id", orgId);
      if (error) throw error;
    }
  };
};

const mapImportSourceFromDb = (dbSource) => {
  if (!dbSource) return null;
  const source = Array.isArray(dbSource) ? dbSource[0] : dbSource;
  if (!source) return null;
  return {
    id: source.id,
    purchaseId: source.purchase_id,
    providerId: source.provider_id,
    fileName: source.file_name ?? void 0,
    fileType: source.file_type ?? void 0,
    importedAt: source.created_at ? new Date(source.created_at) : /* @__PURE__ */ new Date(),
    columnMapping: source.column_mapping ?? void 0,
    rawMetadata: source.raw_metadata ?? null
  };
};
const mapPurchaseFromDb = (dbPurchase) => ({
  id: dbPurchase.id,
  date: new Date(dbPurchase.date),
  providerId: dbPurchase.provider_id,
  providerName: dbPurchase.provider_name,
  items: dbPurchase.items,
  total: dbPurchase.total,
  subtotal: dbPurchase.subtotal ?? dbPurchase.total,
  pricesIncludeIva: dbPurchase.prices_include_iva ?? false,
  ivaApplied: dbPurchase.iva_applied ?? false,
  ivaPercent: dbPurchase.iva_percent ?? void 0,
  taxTotal: dbPurchase.tax_total ?? 0,
  taxBreakdown: dbPurchase.tax_breakdown || null,
  creditDays: dbPurchase.credit_days ?? void 0,
  creditDueDate: dbPurchase.credit_due_date ? new Date(dbPurchase.credit_due_date) : null,
  status: dbPurchase.status,
  importSource: mapImportSourceFromDb(dbPurchase.import_source)
});
const mapPaymentFromDb = (dbPayment) => ({
  ...dbPayment,
  payment_date: new Date(dbPayment.payment_date)
});
const createPurchaseService = (orgId, inventoryService) => {
  const purchaseSelect = "*, import_source:purchase_import_sources(*)";
  const savePurchaseNote = async (purchaseData) => {
    const stockUpdates = purchaseData.items.map((item) => ({
      productId: item.productId,
      quantityChange: item.quantity
    }));
    await inventoryService.updateStock(stockUpdates);
    const subtotal = purchaseData.subtotal;
    const taxTotal = purchaseData.taxTotal;
    const total = subtotal + taxTotal;
    const folioResponse = await supabase.rpc("next_purchase_folio");
    if (folioResponse.error) throw folioResponse.error;
    const newId = `F-${folioResponse.data}`;
    const { data, error } = await supabase.from("ryze_purchases").insert({
      id: newId,
      provider_id: purchaseData.providerId,
      provider_name: purchaseData.providerName,
      items: purchaseData.items,
      subtotal,
      total,
      tax_total: taxTotal,
      prices_include_iva: purchaseData.pricesIncludeIva,
      iva_applied: purchaseData.taxBreakdown?.ivaApplied ?? false,
      iva_percent: purchaseData.taxBreakdown?.ivaPercent,
      tax_breakdown: purchaseData.taxBreakdown,
      credit_days: purchaseData.creditDays ?? null,
      credit_due_date: purchaseData.creditDueDate ?? null,
      status: "Pendiente",
      organization_id: orgId
      // RLS FIX
    }).select(purchaseSelect).single();
    if (error) throw error;
    let enrichedData = data;
    if (purchaseData.importMetadata) {
      const { data: importSource, error: importError } = await supabase.from("purchase_import_sources").insert({
        purchase_id: newId,
        provider_id: purchaseData.providerId,
        file_name: purchaseData.importMetadata.fileName ?? null,
        file_type: purchaseData.importMetadata.fileType ?? null,
        column_mapping: purchaseData.importMetadata.columnMapping ?? null,
        raw_metadata: purchaseData.importMetadata.rawMetadata ?? null,
        organization_id: orgId
      }).select().single();
      if (importError) throw importError;
      enrichedData = { ...data, import_source: importSource };
    }
    return mapPurchaseFromDb(enrichedData);
  };
  return {
    getPurchaseNotes: async () => {
      const { data, error } = await supabase.from("ryze_purchases").select(purchaseSelect).order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPurchaseFromDb);
    },
    savePurchaseNote,
    importPurchaseNote: async (purchaseData, importMetadata) => {
      return await savePurchaseNote({ ...purchaseData, importMetadata });
    },
    addPayment: async (paymentData) => {
      const { error } = await supabase.rpc("add_purchase_payment_and_update_status", {
        p_purchase_id: paymentData.purchaseId,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.paymentMethod,
        p_notes: paymentData.notes,
        p_employee_id: paymentData.employeeId,
        p_employee_name: paymentData.employeeName,
        p_organization_id: orgId
      });
      if (error) throw error;
    },
    getPaymentsForPurchase: async (purchaseId) => {
      const { data, error } = await supabase.from("ryze_purchase_payments").select("*").eq("purchase_id", purchaseId).order("payment_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPaymentFromDb);
    },
    updatePurchaseNoteStatus: async (purchaseId, status) => {
      const { data: purchase, error: fetchError } = await supabase.from("ryze_purchases").select("*").eq("id", purchaseId).single();
      if (fetchError || !purchase) throw fetchError || new Error("Nota de compra no encontrada.");
      if (status === "Cancelada" && !["Pendiente", "Parcialmente Pagada"].includes(purchase.status)) {
        throw new Error(`La nota ya está en estado '${purchase.status}'.`);
      }
      if (status === "Cancelada") {
        const stockUpdates = purchase.items.map((item) => ({
          productId: item.productId,
          quantityChange: -item.quantity
        }));
        await inventoryService.updateStock(stockUpdates);
      }
      const { data, error } = await supabase.from("ryze_purchases").update({ status }).eq("id", purchaseId).select(purchaseSelect).single();
      if (error) throw error;
      return mapPurchaseFromDb(data);
    }
  };
};

const mapQuoteFromDb = (dbQuote) => ({
  ...dbQuote,
  date: new Date(dbQuote.date),
  validUntil: new Date(dbQuote.valid_until),
  clientId: dbQuote.client_id,
  clientName: dbQuote.client_name
});
const createQuoteService = (orgId) => {
  return {
    getQuotes: async () => {
      const { data, error } = await supabase.from("ryze_quotes").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuoteFromDb);
    },
    getQuoteById: async (id) => {
      const { data, error } = await supabase.from("ryze_quotes").select("*").eq("id", id).single();
      if (error) return null;
      return mapQuoteFromDb(data);
    },
    saveQuote: async (quoteData) => {
      const payload = {
        client_id: quoteData.clientId,
        client_name: quoteData.clientName,
        items: quoteData.items,
        subtotal: quoteData.subtotal,
        total: quoteData.total,
        terms: quoteData.terms,
        status: quoteData.status,
        valid_until: quoteData.validUntil.toISOString()
      };
      if (quoteData.id && quoteData.id.startsWith("Q-")) {
        const { data, error } = await supabase.from("ryze_quotes").update(payload).eq("id", quoteData.id).select().single();
        if (error) throw error;
        return mapQuoteFromDb(data);
      } else {
        const { data: nextFolio, error: folioError } = await supabase.rpc("next_quote_folio");
        if (folioError) throw folioError;
        const newId = `Q-${nextFolio}`;
        const { data, error } = await supabase.from("ryze_quotes").insert({ ...payload, id: newId, organization_id: orgId }).select().single();
        if (error) throw error;
        return mapQuoteFromDb(data);
      }
    },
    deleteQuote: async (id) => {
      const { error } = await supabase.from("ryze_quotes").delete().eq("id", id);
      if (error) throw error;
    }
  };
};

const mapCampaignFromDb = (dbCampaign) => ({
  ...dbCampaign,
  createdDate: new Date(dbCampaign.created_date),
  targetSegment: dbCampaign.target_segment
});
const createMarketingService = (orgId) => {
  return {
    getCampaigns: async () => {
      const { data, error } = await supabase.from("ryze_campaigns").select("*").order("created_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapCampaignFromDb);
    },
    saveCampaign: async (campaignData) => {
      const payload = {
        name: campaignData.name,
        target_segment: campaignData.targetSegment,
        subject: campaignData.subject,
        body: campaignData.body,
        status: campaignData.status
      };
      if (campaignData.id) {
        const { data, error } = await supabase.from("ryze_campaigns").update(payload).eq("id", campaignData.id).select().single();
        if (error) throw error;
        return mapCampaignFromDb(data);
      } else {
        const { data, error } = await supabase.from("ryze_campaigns").insert({ ...payload, organization_id: orgId }).select().single();
        if (error) throw error;
        return mapCampaignFromDb(data);
      }
    },
    deleteCampaign: async (id) => {
      const { error } = await supabase.from("ryze_campaigns").delete().eq("id", id);
      if (error) throw error;
    }
  };
};

const mapInvestmentFromDb = (dbInvestment) => ({
  id: dbInvestment.id,
  name: dbInvestment.name,
  type: dbInvestment.type,
  initialCost: dbInvestment.initial_cost,
  initialCostCurrency: dbInvestment.initial_cost_currency,
  currentValue: dbInvestment.current_value,
  lastUpdated: new Date(dbInvestment.last_updated),
  ticker: dbInvestment.ticker,
  quantity: dbInvestment.quantity
});
const mapInvestmentToDb = (appInvestment) => ({
  id: appInvestment.id,
  name: appInvestment.name,
  type: appInvestment.type,
  initial_cost: appInvestment.initialCost,
  initial_cost_currency: appInvestment.initialCostCurrency,
  current_value: appInvestment.currentValue,
  ticker: appInvestment.ticker,
  quantity: appInvestment.quantity
});
const mapLogFromDb = (dbLog) => ({
  id: dbLog.id,
  investmentId: dbLog.investment_id,
  date: new Date(dbLog.date),
  type: dbLog.type,
  description: dbLog.description,
  amount: dbLog.amount
});
const createInvestmentService = (orgId) => {
  return {
    getInvestments: async () => {
      const { data, error } = await supabase.from("ryze_investments").select("*").order("name");
      if (error) throw error;
      return (data || []).map(mapInvestmentFromDb);
    },
    saveInvestment: async (investmentData) => {
      const payload = {
        ...mapInvestmentToDb(investmentData),
        last_updated: (/* @__PURE__ */ new Date()).toISOString()
        // Always update the timestamp
      };
      if (investmentData.id) {
        const { data, error } = await supabase.from("ryze_investments").update(payload).eq("id", investmentData.id).select().single();
        if (error) throw error;
        return mapInvestmentFromDb(data);
      } else {
        const { data, error } = await supabase.from("ryze_investments").insert({ ...payload, organization_id: orgId }).select().single();
        if (error) throw error;
        return mapInvestmentFromDb(data);
      }
    },
    deleteInvestment: async (id) => {
      await supabase.from("ryze_investment_logs").delete().eq("investment_id", id);
      const { error } = await supabase.from("ryze_investments").delete().eq("id", id);
      if (error) throw error;
    },
    getLogsForInvestment: async (investmentId) => {
      const { data, error } = await supabase.from("ryze_investment_logs").select("*").eq("investment_id", investmentId).order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLogFromDb);
    },
    addLog: async (logData) => {
      const { data, error } = await supabase.from("ryze_investment_logs").insert({
        investment_id: logData.investmentId,
        type: logData.type,
        description: logData.description,
        amount: logData.amount,
        organization_id: orgId
        // RLS FIX
      }).select().single();
      if (error) throw error;
      return mapLogFromDb(data);
    }
  };
};

const mapPayrollFromDb = (dbPayroll) => ({
  id: dbPayroll.id,
  periodStartDate: new Date(dbPayroll.period_start_date),
  periodEndDate: new Date(dbPayroll.period_end_date),
  paymentDate: new Date(dbPayroll.payment_date),
  totalAmount: dbPayroll.total_amount,
  status: dbPayroll.status,
  employeeCount: dbPayroll.employee_count,
  expenseId: dbPayroll.expense_id
});
const mapPayrollItemFromDb = (dbItem) => ({
  id: dbItem.id,
  payrollId: dbItem.payroll_id,
  employeeId: dbItem.employee_id,
  employeeName: dbItem.employee_name,
  grossSalary: dbItem.gross_salary,
  bonuses: dbItem.bonuses,
  deductions: dbItem.deductions,
  netSalary: dbItem.net_salary,
  adjustmentNote: dbItem.adjustment_note
});
const createPayrollService = (orgId, expenseService, commissionService) => {
  return {
    getPayrolls: async () => {
      const { data, error } = await supabase.from("ryze_payrolls").select("*").order("payment_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPayrollFromDb);
    },
    getPayrollWithItems: async (payrollId) => {
      const { data: payrollData, error: payrollError } = await supabase.from("ryze_payrolls").select("*").eq("id", payrollId).single();
      if (payrollError) throw payrollError;
      const { data: itemsData, error: itemsError } = await supabase.from("ryze_payroll_items").select("*").eq("payroll_id", payrollId);
      if (itemsError) throw itemsError;
      return {
        payroll: mapPayrollFromDb(payrollData),
        items: itemsData.map(mapPayrollItemFromDb)
      };
    },
    getLastPayrollItemForEmployee: async (employeeId) => {
      const { data, error } = await supabase.from("ryze_payroll_items").select("*, ryze_payrolls(payment_date)").eq("employee_id", employeeId).order("ryze_payrolls(payment_date)", { ascending: false, foreignTable: "ryze_payrolls" }).limit(1).single();
      if (error && error.code !== "PGRST116") throw error;
      return data ? mapPayrollItemFromDb(data) : null;
    },
    getEmployeesWithPayrollInPeriod: async (start, end) => {
      const startISO = start.toISOString().split("T")[0];
      const endISO = end.toISOString().split("T")[0];
      const { data, error } = await supabase.from("ryze_payroll_items").select("employee_id, payroll:ryze_payrolls(period_start_date, period_end_date)").eq("organization_id", orgId).gte("ryze_payrolls.period_end_date", startISO, { foreignTable: "ryze_payrolls" }).lte("ryze_payrolls.period_start_date", endISO, { foreignTable: "ryze_payrolls" });
      if (error) throw error;
      const employees = /* @__PURE__ */ new Set();
      (data || []).forEach((record) => {
        const payroll = record.payroll;
        if (!payroll) return;
        const payrollStart = new Date(payroll.period_start_date);
        const payrollEnd = new Date(payroll.period_end_date);
        if (payrollStart <= end && payrollEnd >= start && record.employee_id) {
          employees.add(record.employee_id);
        }
      });
      return employees;
    },
    runPayroll: async (period, items, employeeId, employeeName, commissionsToPay, timeEntriesToPay) => {
      const totalAmount = items.reduce((sum, item) => sum + item.netSalary, 0);
      const expenseRecord = await expenseService.addExpense({
        date: /* @__PURE__ */ new Date(),
        description: `Nómina del ${period.start.toLocaleDateString()} al ${period.end.toLocaleDateString()}`,
        amount: totalAmount,
        paymentMethod: "nomina",
        employeeId,
        employeeName
      });
      const { data: payroll, error: payrollError } = await supabase.from("ryze_payrolls").insert({
        organization_id: orgId,
        period_start_date: period.start.toISOString().split("T")[0],
        period_end_date: period.end.toISOString().split("T")[0],
        total_amount: totalAmount,
        employee_count: items.length,
        expense_id: expenseRecord.id
      }).select().single();
      if (payrollError) throw payrollError;
      const itemsToInsert = items.map((item) => ({
        payroll_id: payroll.id,
        organization_id: orgId,
        employee_id: item.employeeId,
        employee_name: item.employeeName,
        gross_salary: item.grossSalary,
        bonuses: item.bonuses,
        deductions: item.deductions,
        net_salary: item.netSalary,
        adjustment_note: item.adjustmentNote
      }));
      const { data: insertedItems, error: itemsError } = await supabase.from("ryze_payroll_items").insert(itemsToInsert).select();
      if (itemsError) {
        console.error("Failed to insert payroll items, but payroll and expense were created.", itemsError);
        throw itemsError;
      }
      for (const item of insertedItems) {
        const commissionIds = commissionsToPay[item.employee_id];
        if (commissionIds && commissionIds.length > 0) {
          await commissionService.markCommissionsAsPaid(commissionIds, item.id);
        }
      }
      if (timeEntriesToPay) {
        const timeEntriesToInsert = [];
        for (const item of insertedItems) {
          const entryIds = timeEntriesToPay[item.employee_id];
          if (entryIds && entryIds.length > 0) {
            for (const entryId of entryIds) {
              timeEntriesToInsert.push({
                organization_id: orgId,
                payroll_item_id: item.id,
                time_clock_entry_id: entryId
              });
            }
          }
        }
        if (timeEntriesToInsert.length > 0) {
          const { error: timeEntriesError } = await supabase.from("ryze_payroll_time_entries").insert(timeEntriesToInsert);
          if (timeEntriesError) {
            console.error("Error marking time entries as paid:", timeEntriesError);
          }
        }
      }
      return mapPayrollFromDb(payroll);
    }
  };
};

const createTimeClockService = (orgId) => {
  let _employeesCache = null;
  const getPaidEntryIds = async (entryIds) => {
    if (entryIds.length === 0) return /* @__PURE__ */ new Set();
    const { data, error } = await supabase.from("ryze_payroll_time_entries").select("time_clock_entry_id").in("time_clock_entry_id", entryIds);
    if (error) {
      console.error("Error checking paid entries:", error);
      return /* @__PURE__ */ new Set();
    }
    return new Set((data || []).map((e) => e.time_clock_entry_id));
  };
  const getEmployeesWithCache = async () => {
    if (_employeesCache) {
      return _employeesCache;
    }
    const { data, error } = await supabase.from("ryze_employees").select("id, name").eq("organization_id", orgId);
    if (error) {
      console.error("Error fetching employees for time clock service:", error);
      return [];
    }
    _employeesCache = data || [];
    return _employeesCache;
  };
  const mapEntryFromDb = (dbEntry, allEmployees) => {
    const employee = allEmployees.find((e) => e.id === dbEntry.employee_id);
    return {
      id: dbEntry.id,
      employeeId: dbEntry.employee_id,
      employeeName: employee?.name || "Desconocido",
      // Nombre de respaldo
      checkInTime: new Date(dbEntry.check_in_time),
      checkOutTime: dbEntry.check_out_time ? new Date(dbEntry.check_out_time) : void 0,
      status: dbEntry.status,
      managerNotes: dbEntry.manager_notes,
      totalMinutes: dbEntry.total_minutes
    };
  };
  return {
    checkIn: async (employeeId) => {
      const { data, error } = await supabase.from("ryze_time_clock_entries").insert({ employee_id: employeeId, organization_id: orgId }).select("*").single();
      if (error) throw error;
      const employees = await getEmployeesWithCache();
      return mapEntryFromDb(data, employees);
    },
    checkOut: async (employeeId) => {
      const { data: openEntry, error: findError } = await supabase.from("ryze_time_clock_entries").select("*").eq("employee_id", employeeId).is("check_out_time", null).order("check_in_time", { ascending: false }).limit(1).single();
      if (findError || !openEntry) throw findError || new Error("No open check-in found.");
      const checkOutTime = /* @__PURE__ */ new Date();
      const checkInTime = new Date(openEntry.check_in_time);
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      const totalMinutes = Math.ceil(diffMs / (1e3 * 60));
      const { data, error } = await supabase.from("ryze_time_clock_entries").update({ check_out_time: checkOutTime.toISOString(), total_minutes: totalMinutes }).eq("id", openEntry.id).select("*").single();
      if (error) throw error;
      const employees = await getEmployeesWithCache();
      return mapEntryFromDb(data, employees);
    },
    getEmployeeStatus: async (employeeId) => {
      const { data, error } = await supabase.from("ryze_time_clock_entries").select("*").eq("employee_id", employeeId).is("check_out_time", null).order("check_in_time", { ascending: false }).limit(1).single();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) return null;
      const employees = await getEmployeesWithCache();
      return mapEntryFromDb(data, employees);
    },
    getTimeEntries: async (filters) => {
      let query = supabase.from("ryze_time_clock_entries").select("*").gte("check_in_time", filters.startDate.toISOString()).lte("check_in_time", filters.endDate.toISOString()).order("check_in_time", { ascending: false });
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      const { data: entries, error } = await query;
      if (error) throw error;
      if (!entries) return [];
      const employees = await getEmployeesWithCache();
      return entries.map((entry) => mapEntryFromDb(entry, employees));
    },
    updateEntryStatus: async (entryId, status, notes) => {
      const { data, error } = await supabase.from("ryze_time_clock_entries").update({ status, manager_notes: notes }).eq("id", entryId).select("*").single();
      if (error) throw error;
      const employees = await getEmployeesWithCache();
      return mapEntryFromDb(data, employees);
    },
    adjustEntry: async (entryId, payload) => {
      const totalMinutes = Math.max(
        1,
        Math.ceil((payload.checkOutTime.getTime() - payload.checkInTime.getTime()) / (1e3 * 60))
      );
      const updates = {
        check_in_time: payload.checkInTime.toISOString(),
        check_out_time: payload.checkOutTime.toISOString(),
        total_minutes: totalMinutes,
        status: payload.status,
        manager_notes: payload.managerNotes ?? null
      };
      const { data, error } = await supabase.from("ryze_time_clock_entries").update(updates).eq("id", entryId).select("*").single();
      if (error) throw error;
      const employees = await getEmployeesWithCache();
      return mapEntryFromDb(data, employees);
    },
    getApprovedHoursForPeriod: async (employeeId, startDate, endDate) => {
      const { data, error } = await supabase.from("ryze_time_clock_entries").select("check_in_time, check_out_time, total_minutes, id").eq("employee_id", employeeId).eq("status", "approved").gte("check_in_time", startDate.toISOString()).lte("check_in_time", endDate.toISOString());
      if (error) throw error;
      const entryIds = (data || []).map((e) => e.id);
      let paidEntryIds = /* @__PURE__ */ new Set();
      if (entryIds.length > 0) {
        const { data: paidEntries, error: paidError } = await supabase.from("ryze_payroll_time_entries").select("time_clock_entry_id").in("time_clock_entry_id", entryIds);
        if (!paidError && paidEntries) {
          paidEntryIds = new Set(paidEntries.map((e) => e.time_clock_entry_id));
        }
      }
      const unpaidData = (data || []).filter((entry) => !paidEntryIds.has(entry.id));
      const totalMinutes = unpaidData.reduce((sum, entry) => {
        if (entry.check_in_time && entry.check_out_time) {
          const checkIn = new Date(entry.check_in_time);
          const checkOut = new Date(entry.check_out_time);
          const diffMinutes = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1e3 * 60)));
          return sum + diffMinutes;
        }
        return sum + (entry.total_minutes || 0);
      }, 0);
      const decimalHours = Math.round(totalMinutes / 60 * 100) / 100;
      return { decimalHours, totalMinutes };
    },
    getPaidEntryIds,
    getApprovedTimeEntriesForPeriod: async (employeeId, startDate, endDate) => {
      const { data, error } = await supabase.from("ryze_time_clock_entries").select("id").eq("employee_id", employeeId).eq("status", "approved").gte("check_in_time", startDate.toISOString()).lte("check_in_time", endDate.toISOString());
      if (error) throw error;
      const entryIds = (data || []).map((e) => e.id);
      if (entryIds.length === 0) return [];
      const paidEntryIds = await getPaidEntryIds(entryIds);
      return entryIds.filter((id) => !paidEntryIds.has(id));
    },
    autoCloseStaleEntries: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
      const { data: staleEntries, error: findError } = await supabase.from("ryze_time_clock_entries").select("id, check_in_time").is("check_out_time", null).lt("check_in_time", twentyFourHoursAgo);
      if (findError) {
        console.error("Error finding stale entries:", findError);
        return 0;
      }
      if (staleEntries.length === 0) {
        return 0;
      }
      for (const entry of staleEntries) {
        const checkInTime = new Date(entry.check_in_time);
        const autoCheckoutTime = new Date(checkInTime.getTime() + 24 * 60 * 60 * 1e3);
        const totalMinutes = 24 * 60;
        await supabase.from("ryze_time_clock_entries").update({
          check_out_time: autoCheckoutTime.toISOString(),
          total_minutes: totalMinutes,
          manager_notes: "Cierre automático por exceder 24h. Favor de verificar y ajustar la hora de salida real."
        }).eq("id", entry.id);
      }
      return staleEntries.length;
    }
  };
};

const mapRuleFromDb = (dbRule) => ({
  ...dbRule,
  created_at: new Date(dbRule.created_at)
});
const findBestRule = (rules, employee, item) => {
  const { id: employeeId, role } = employee;
  const { id: productId, category } = item;
  const scores = {
    "employee": 30,
    "role": 20,
    "all_employees": 10,
    "product": 3,
    "category": 2,
    "all_products": 1
  };
  let bestRule = null;
  let maxScore = -1;
  for (const rule of rules) {
    let currentScore = 0;
    let targetMatch = false;
    let appliesToMatch = false;
    if (rule.target_type === "product" && rule.target_id === productId) {
      currentScore += scores.product;
      targetMatch = true;
    } else if (rule.target_type === "category" && rule.target_id === category) {
      currentScore += scores.category;
      targetMatch = true;
    } else if (rule.target_type === "all_products") {
      currentScore += scores.all_products;
      targetMatch = true;
    }
    if (!targetMatch) continue;
    if (rule.applies_to_type === "employee" && rule.applies_to_id === employeeId) {
      currentScore += scores.employee;
      appliesToMatch = true;
    } else if (rule.applies_to_type === "role" && rule.applies_to_id === role) {
      currentScore += scores.role;
      appliesToMatch = true;
    } else if (rule.applies_to_type === "all_employees") {
      currentScore += scores.all_employees;
      appliesToMatch = true;
    }
    if (appliesToMatch && currentScore > maxScore) {
      maxScore = currentScore;
      bestRule = rule;
    }
  }
  return bestRule;
};
const createCommissionService = (orgId) => {
  const service = {
    getCommissionRules: async () => {
      const { data, error } = await supabase.from("ryze_commissions").select("*").order("name");
      if (error) throw error;
      return (data || []).map(mapRuleFromDb);
    },
    saveCommissionRule: async (ruleData) => {
      const payload = {
        ...ruleData,
        organization_id: orgId
      };
      if (ruleData.id) {
        const { data, error } = await supabase.from("ryze_commissions").update(payload).eq("id", ruleData.id).select().single();
        if (error) throw error;
        return mapRuleFromDb(data);
      } else {
        const { data, error } = await supabase.from("ryze_commissions").insert(payload).select().single();
        if (error) throw error;
        return mapRuleFromDb(data);
      }
    },
    deleteCommissionRule: async (id) => {
      const { error } = await supabase.from("ryze_commissions").delete().eq("id", id);
      if (error) throw error;
    },
    calculateAndSaveCommissionsForSale: async (sale, employee) => {
      const rules = await service.getCommissionRules();
      if (rules.length === 0) return;
      const commissionsToCreate = [];
      for (const item of sale.items) {
        const bestRule = findBestRule(rules, employee, item);
        if (bestRule) {
          let amount = 0;
          switch (bestRule.type) {
            case "percentage_sale":
              amount = (item.price * item.quantity - (item.discount?.calculatedDiscount || 0)) * (bestRule.value / 100);
              break;
            case "percentage_profit":
              const profit = (item.price - (item.costPrice ?? 0)) * item.quantity - (item.discount?.calculatedDiscount || 0);
              if (profit > 0) {
                amount = profit * (bestRule.value / 100);
              }
              break;
            case "fixed_amount_per_item":
              amount = item.quantity * bestRule.value;
              break;
          }
          if (amount > 0) {
            commissionsToCreate.push({
              sale_id: sale.id,
              employee_id: employee.id,
              commission_rule_id: bestRule.id,
              cart_item_id: item.id,
              commission_amount: amount
            });
          }
        }
      }
      if (commissionsToCreate.length > 0) {
        const payload = commissionsToCreate.map((c) => ({ ...c, organization_id: orgId }));
        const { error } = await supabase.from("ryze_sale_commissions").insert(payload);
        if (error) {
          console.error("Error saving sale commissions:", error);
        }
      }
    },
    getUnpaidCommissionsForEmployee: async (employeeId, startDate, endDate) => {
      const { data, error } = await supabase.from("ryze_sale_commissions").select("*").eq("employee_id", employeeId).is("payroll_item_id", null).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
      if (error) throw error;
      return data || [];
    },
    markCommissionsAsPaid: async (commissionIds, payrollItemId) => {
      if (commissionIds.length === 0) return;
      const { error } = await supabase.from("ryze_sale_commissions").update({ payroll_item_id: payrollItemId }).in("id", commissionIds);
      if (error) throw error;
    },
    getCommissionPerformanceSummary: async (startDate, endDate) => {
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const [commissionsRes, salesRes] = await Promise.all([
        supabase.from("ryze_sale_commissions").select("id, employee_id, commission_amount, payroll_item_id, commission_rule_id").eq("organization_id", orgId).gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("ryze_sales").select("employee_id,total").eq("organization_id", orgId).eq("type", "sale").gte("date", startISO).lte("date", endISO)
      ]);
      if (commissionsRes.error) throw commissionsRes.error;
      if (salesRes.error) throw salesRes.error;
      const rows = commissionsRes.data || [];
      const salesRows = salesRes.data || [];
      const salesTotals = /* @__PURE__ */ new Map();
      salesRows.forEach((row) => {
        if (!row.employee_id) return;
        salesTotals.set(row.employee_id, (salesTotals.get(row.employee_id) || 0) + (row.total || 0));
      });
      const commissionEmployeeIds = rows.map((r) => r.employee_id).filter(Boolean);
      const salesEmployeeIds = Array.from(salesTotals.keys());
      const employeeIds = Array.from(/* @__PURE__ */ new Set([...commissionEmployeeIds, ...salesEmployeeIds])).filter(Boolean);
      Array.from(new Set(rows.map((r) => r.commission_rule_id).filter(Boolean)));
      const [employeesRes, rulesRes] = await Promise.all([
        employeeIds.length > 0 ? supabase.from("ryze_employees").select("id,name").in("id", employeeIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("ryze_commissions").select("id,name,quota_amount")
      ]);
      if (employeesRes.error) throw employeesRes.error;
      if (rulesRes.error) throw rulesRes.error;
      const employeeMap = /* @__PURE__ */ new Map();
      (employeesRes.data || []).forEach((emp) => employeeMap.set(emp.id, emp.name || "Empleado"));
      const allRules = rulesRes.data || [];
      const ruleMap = /* @__PURE__ */ new Map();
      allRules.forEach((rule) => ruleMap.set(rule.id, { name: rule.name || "Regla", quota_amount: rule.quota_amount }));
      const quotaRules = allRules.filter((rule) => (rule.quota_amount ?? 0) > 0);
      const summaryMap = /* @__PURE__ */ new Map();
      const ensureEntry = (employeeId) => {
        if (!summaryMap.has(employeeId)) {
          summaryMap.set(employeeId, {
            employeeId,
            employeeName: employeeMap.get(employeeId) || "Empleado",
            pendingTotal: 0,
            pendingCount: 0,
            paidTotal: 0,
            paidCount: 0,
            ruleBreakdown: [],
            salesTotal: salesTotals.get(employeeId) || 0,
            quotaProgress: []
          });
        }
        return summaryMap.get(employeeId);
      };
      rows.forEach((record) => {
        const employeeId = record.employee_id;
        if (!employeeId) return;
        const entry = ensureEntry(employeeId);
        const isPaid = !!record.payroll_item_id;
        if (isPaid) {
          entry.paidTotal += record.commission_amount;
          entry.paidCount += 1;
        } else {
          entry.pendingTotal += record.commission_amount;
          entry.pendingCount += 1;
        }
        const ruleId = record.commission_rule_id;
        if (ruleId) {
          let breakdown = entry.ruleBreakdown.find((b) => b.ruleId === ruleId);
          if (!breakdown) {
            const info = ruleMap.get(ruleId);
            breakdown = { ruleId, ruleName: info?.name || "Regla", total: 0, count: 0 };
            entry.ruleBreakdown.push(breakdown);
          }
          breakdown.total += record.commission_amount;
          breakdown.count += 1;
        }
      });
      salesTotals.forEach((total, employeeId) => {
        const entry = ensureEntry(employeeId);
        entry.salesTotal = total;
      });
      summaryMap.forEach((entry) => {
        entry.quotaProgress = quotaRules.map((rule) => {
          const quotaAmount = rule.quota_amount || 0;
          const achieved = entry.salesTotal;
          return {
            ruleId: rule.id,
            ruleName: rule.name,
            quotaAmount,
            achieved,
            met: achieved >= quotaAmount,
            remaining: Math.max(0, quotaAmount - achieved)
          };
        });
      });
      const sorted = Array.from(summaryMap.values()).sort((a, b) => {
        const totalA = a.paidTotal + a.pendingTotal;
        const totalB = b.paidTotal + b.pendingTotal;
        if (totalB !== totalA) return totalB - totalA;
        return b.salesTotal - a.salesTotal;
      });
      return sorted;
    },
    getCommissionHistory: async (employeeId, startDate, endDate) => {
      const { data, error } = await supabase.from("ryze_sale_commissions").select("id, commission_amount, payroll_item_id, created_at, sale_id, commission_rule_id").eq("organization_id", orgId).eq("employee_id", employeeId).gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString()).order("created_at", { ascending: false });
      if (error) throw error;
      const records = data || [];
      if (records.length === 0) return [];
      const ruleIds = Array.from(new Set(records.map((r) => r.commission_rule_id).filter(Boolean)));
      const { data: rulesData, error: rulesError } = ruleIds.length > 0 ? await supabase.from("ryze_commissions").select("id,name").in("id", ruleIds) : { data: [], error: null };
      if (rulesError) throw rulesError;
      const ruleMap = /* @__PURE__ */ new Map();
      (rulesData || []).forEach((rule) => ruleMap.set(rule.id, rule.name || "Regla"));
      return records.map((record) => ({
        id: record.id,
        employeeId,
        employeeName: "",
        // front will use selected employee name
        amount: record.commission_amount,
        status: record.payroll_item_id ? "paid" : "pending",
        ruleId: record.commission_rule_id,
        ruleName: ruleMap.get(record.commission_rule_id) || "Regla",
        saleId: record.sale_id,
        createdAt: new Date(record.created_at)
      }));
    }
  };
  return service;
};

const mapPriceListFromDb = (dbList) => ({
  id: dbList.id,
  organizationId: dbList.organization_id,
  name: dbList.name,
  description: dbList.description || void 0,
  isActive: dbList.is_active,
  sortOrder: dbList.sort_order,
  defaultMarginSource: dbList.default_margin_source,
  defaultMarginPercent: Number(dbList.default_margin_percent ?? 0)
});
const mapEntryFromDb = (dbEntry) => ({
  id: dbEntry.id,
  priceListId: dbEntry.price_list_id,
  productId: dbEntry.product_id,
  price: Number(dbEntry.price),
  sourcePrice: dbEntry.source_price !== null ? Number(dbEntry.source_price) : void 0,
  sourceType: dbEntry.source_type,
  isManual: dbEntry.is_manual,
  priceListName: dbEntry.price_list?.name
});
const createPriceListService = (orgId) => {
  return {
    getPriceLists: async () => {
      const { data, error } = await supabase.from("price_lists").select("*").eq("organization_id", orgId).order("sort_order");
      if (error) throw error;
      return (data || []).map(mapPriceListFromDb);
    },
    createPriceList: async (payload) => {
      const { data: existingLists, error: fetchError } = await supabase.from("price_lists").select("sort_order").eq("organization_id", orgId).order("sort_order", { ascending: false }).limit(1);
      if (fetchError) throw fetchError;
      const nextSortOrder = existingLists && existingLists.length > 0 ? (existingLists[0].sort_order || 0) + 1 : 1;
      const { data, error } = await supabase.from("price_lists").insert({
        organization_id: orgId,
        name: payload.name,
        description: payload.description,
        default_margin_source: payload.marginSource || "base_price",
        default_margin_percent: payload.marginPercent ?? 0,
        sort_order: nextSortOrder
      }).select("*").single();
      if (error) throw error;
      return mapPriceListFromDb(data);
    },
    updatePriceList: async (id, payload) => {
      const dbPayload = {};
      if (payload.name !== void 0) dbPayload.name = payload.name;
      if (payload.description !== void 0) dbPayload.description = payload.description;
      if (payload.isActive !== void 0) dbPayload.is_active = payload.isActive;
      if (payload.marginSource !== void 0) dbPayload.default_margin_source = payload.marginSource;
      if (payload.marginPercent !== void 0) dbPayload.default_margin_percent = payload.marginPercent;
      const { data, error } = await supabase.from("price_lists").update(dbPayload).eq("id", id).eq("organization_id", orgId).select("*").single();
      if (error) throw error;
      return mapPriceListFromDb(data);
    },
    deletePriceList: async (id) => {
      const { error } = await supabase.from("price_lists").delete().eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
    },
    reorderPriceLists: async (orderedIds) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
        organization_id: orgId
      }));
      const { error } = await supabase.from("price_lists").upsert(updates, { onConflict: "id" });
      if (error) throw error;
    },
    getEntriesForProduct: async (productId) => {
      const { data, error } = await supabase.from("price_list_entries").select("*, price_list:price_lists(name)").eq("organization_id", orgId).eq("product_id", productId);
      if (error) throw error;
      return (data || []).map(mapEntryFromDb);
    },
    getEntriesForProducts: async (productIds) => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase.from("price_list_entries").select("*, price_list:price_lists(name)").eq("organization_id", orgId).in("product_id", productIds);
      if (error) throw error;
      return (data || []).map(mapEntryFromDb);
    },
    saveProductPrices: async (productId, entries) => {
      if (entries.length === 0) return;
      const rows = entries.map((entry) => ({
        price_list_id: entry.priceListId,
        organization_id: orgId,
        product_id: productId,
        price: entry.price,
        source_type: entry.sourceType || "base_price",
        is_manual: entry.isManual ?? true
      }));
      const { error } = await supabase.from("price_list_entries").upsert(rows, { onConflict: "price_list_id,product_id" });
      if (error) throw error;
    },
    removeProductPrices: async (productId, priceListIds) => {
      if (priceListIds.length === 0) return;
      const { error } = await supabase.from("price_list_entries").delete().eq("product_id", productId).eq("organization_id", orgId).in("price_list_id", priceListIds);
      if (error) throw error;
    },
    applyMarginRule: async (priceListId, source, percent) => {
      const { error } = await supabase.rpc("apply_price_list_margin", {
        p_price_list_id: priceListId,
        p_margin_source: source,
        p_margin_percent: percent
      });
      if (error) throw error;
    }
  };
};

const DEFAULT_TICKET_LAYOUT = {
  logo: null,
  headerText: "Tu Negocio\nDirección y Teléfono",
  footerText: "¡Gracias por tu compra!",
  showSku: true,
  showClient: true,
  showSeller: true,
  showDiscounts: true,
  paperSize: "58mm",
  fontFamily: "Fira Sans",
  fontFamilyBold: "Fira Sans",
  fontSize: 12,
  fontSizeBold: 14
};
const PAPER_CONFIGS = {
  "58mm": { width: 58, padding: 4, baseFontSize: 11, boldFontSize: 13 },
  "80mm": { width: 80, padding: 6, baseFontSize: 13, boldFontSize: 16 },
  "custom": { width: 58, padding: 4, baseFontSize: 12, boldFontSize: 14 }
  // Default, se sobrescribe con customPaperWidth
};
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const formatCurrency$1 = (value, currency = "MXN") => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);
const buildTicketHtml = (sale, organization, options = {}) => {
  const layout = { ...DEFAULT_TICKET_LAYOUT, ...options.layoutOverride || organization.uiSettings?.ticketLayout || {} };
  const title = organization.name || "Ryze POS";
  const headerLines = (layout.headerText || "").split("\n").map((line) => escapeHtml(line));
  const footerLines = (layout.footerText || "").split("\n").map((line) => escapeHtml(line));
  const paperSize = layout.paperSize || "58mm";
  const paperConfig = PAPER_CONFIGS[paperSize];
  const paperWidth = paperSize === "custom" && layout.customPaperWidth ? layout.customPaperWidth : paperConfig.width;
  const padding = paperConfig.padding;
  const baseFontSize = layout.fontSize || paperConfig.baseFontSize;
  const boldFontSize = layout.fontSizeBold || paperConfig.boldFontSize;
  const fontFamily = layout.fontFamily || "Fira Sans";
  const fontFamilyBold = layout.fontFamilyBold || fontFamily;
  const itemsRows = sale.items.map((item) => {
    const skuText = layout.showSku ? ` <span class="sku">${item.id}</span>` : "";
    const discountInfo = item.discount && layout.showDiscounts ? `<div class="discount">Desc: -${formatCurrency$1(item.discount.calculatedDiscount)}</div>` : "";
    return `<tr>
            <td class="product">
                <div class="name">${escapeHtml(item.name)}${skuText}</div>
                <div class="meta">${item.quantity} x ${formatCurrency$1(item.price)}</div>
                ${discountInfo}
            </td>
            <td class="price">${formatCurrency$1(item.price * item.quantity)}</td>
        </tr>`;
  }).join("");
  const totalsRows = [
    `<div class="summary-row"><span>Subtotal:</span><span>${formatCurrency$1(sale.subtotal)}</span></div>`
  ];
  if (layout.showDiscounts && sale.totalDiscount > 0) {
    totalsRows.push(`<div class="summary-row"><span>Descuentos:</span><span>- ${formatCurrency$1(sale.totalDiscount)}</span></div>`);
  }
  totalsRows.push(`<div class="summary-row total"><span>Total:</span><span>${formatCurrency$1(sale.total)}</span></div>`);
  const infoBlocks = [];
  if (layout.showSeller && sale.employeeName) {
    infoBlocks.push(`<div>Vendedor: ${escapeHtml(sale.employeeName)}</div>`);
  }
  if (layout.showClient && sale.clientName) {
    infoBlocks.push(`<div>Cliente: ${escapeHtml(sale.clientName)}</div>`);
  }
  const headerHtml = [
    layout.logo ? `<img src="${layout.logo}" alt="Logo" class="ticket-logo" />` : "",
    headerLines.length ? `<div class="header-text">${headerLines.join("<br/>")}</div>` : ""
  ].join("");
  const footerHtml = footerLines.length ? `<div class="footer-text">${footerLines.join("<br/>")}</div>` : "";
  const logoMaxHeight = paperWidth <= 58 ? 50 : 70;
  const body = `
    ${headerHtml}
    <div class="meta-block">
        <div>Ticket: ${sale.ticketNumber}</div>
        <div>${sale.date.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</div>
        ${infoBlocks.join("")}
    </div>
    <table class="items">
        <tbody>${itemsRows}</tbody>
    </table>
    <div class="divider"></div>
    <div class="totals">${totalsRows.join("")}</div>
    ${footerHtml}
    `;
  if (options.variant === "preview") {
    const previewWidth = Math.round(paperWidth * 1.5);
    const previewStyles = `
            @import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily.replace(" ", "+"))}:wght@400;600;700&family=${encodeURIComponent(fontFamilyBold.replace(" ", "+"))}:wght@400;600;700&display=swap');
            .ticket-preview-root { font-family: '${fontFamily}', system-ui, sans-serif; }
            .ticket-preview {
                width: ${previewWidth}px;
                background: #fff;
                color: #0f172a;
                margin: 0 auto;
                padding: ${padding * 1.5}px;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
            }
            .ticket-logo { max-height: ${logoMaxHeight * 1.5}px; display:block; margin:0 auto 8px; }
            .header-text { text-align:center; font-size:${baseFontSize}px; margin-bottom:8px; white-space:pre-line; }
            h1 { font-family:'${fontFamilyBold}',system-ui,sans-serif; font-size:${boldFontSize}px; margin:0; text-transform:uppercase; text-align:center; font-weight:700; }
            .meta-block { font-size:${baseFontSize - 1}px; margin-bottom:8px; line-height:1.3; }
            table.items { width:100%; border-collapse:collapse; font-size:${baseFontSize - 1}px; }
            td { padding:4px 0; vertical-align:top; }
            td.price { text-align:right; font-weight:600; }
            .name { font-family:'${fontFamilyBold}',system-ui,sans-serif; font-weight:600; font-size:${baseFontSize}px; }
            .sku { display:block; font-size:${baseFontSize - 2}px; color:#475569; }
            .meta { font-size:${baseFontSize - 2}px; color:#475569; }
            .discount { font-size:${baseFontSize - 2}px; color:#059669; }
            .divider { border-top:1px dashed #cbd5f5; margin:${padding * 1.5}px 0; }
            .summary-row { display:flex; justify-content:space-between; font-size:${baseFontSize - 1}px; margin-bottom:4px; }
            .summary-row.total { font-family:'${fontFamilyBold}',system-ui,sans-serif; font-size:${baseFontSize}px; font-weight:700; }
            .footer-text { text-align:center; font-size:${baseFontSize - 2}px; margin-top:${padding * 1.5}px; white-space:pre-line; }
        `;
    return `
        <div class="ticket-preview-root">
            <style>${previewStyles}</style>
            <div class="ticket-preview">
                <h1>${escapeHtml(title)}</h1>
                ${body}
            </div>
        </div>`;
  }
  const styles = `
@page { size: ${paperWidth}mm auto; margin: 0; }
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily.replace(" ", "+"))}:wght@400;600;700&family=${encodeURIComponent(fontFamilyBold.replace(" ", "+"))}:wght@400;600;700&display=swap');
body{
    font-family:'${fontFamily}',system-ui,sans-serif;
    width:${paperWidth}mm;
    margin:0 auto;
    padding:${padding}mm;
    background:#fff;
    color:#0f172a;
    font-size:${baseFontSize}px;
}
h1{
    font-family:'${fontFamilyBold}',system-ui,sans-serif;
    font-size:${boldFontSize}px;
    margin:0;
    text-transform:uppercase;
    text-align:center;
    font-weight:700;
}
table.items{
    width:100%;
    border-collapse:collapse;
    margin-top:${padding}mm;
}
td{
    padding:1mm 0;
    vertical-align:top;
    font-size:${baseFontSize - 1}px;
}
td.price{text-align:right;font-weight:600;}
.product .name{font-family:'${fontFamilyBold}',system-ui,sans-serif;font-weight:600;font-size:${baseFontSize}px;}
.product .sku{display:block;font-size:${baseFontSize - 2}px;color:#64748b;}
.product .meta{font-size:${baseFontSize - 2}px;color:#475569;}
.discount{font-size:${baseFontSize - 2}px;color:#059669;}
.divider{
    border-top:1px dashed #cbd5f5;
    margin:${padding}mm 0;
}
.totals{
    font-family:'${fontFamilyBold}',system-ui,sans-serif;
    font-size:${baseFontSize}px;
    font-weight:700;
    text-align:right;
}
.summary-row{display:flex;justify-content:space-between;font-size:${baseFontSize - 1}px;}
.summary-row.total{font-family:'${fontFamilyBold}',system-ui,sans-serif;font-size:${baseFontSize}px;font-weight:700;}
.footer-text{
    margin-top:${padding}mm;
    font-size:${baseFontSize - 2}px;
    text-align:center;
    color:#475569;
}
.ticket-logo{max-height:${logoMaxHeight}px;display:block;margin:0 auto 4px;}
.header-text,.footer-text{white-space:pre-line;}
.meta-block{font-size:${baseFontSize - 1}px;line-height:1.3;}
`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${styles}</style>
</head>
<body>
    <h1>${escapeHtml(title)}</h1>
    ${body}
</body>
</html>`;
};

const defaultBrowserPrinter = {
  id: "browser-default",
  name: "Impresora del navegador",
  type: "system",
  status: "online",
  capabilities: ["ticket"]
};
const createTicketService = () => {
  const openPrintWindow = (html) => {
    const printWindow = window.open("", "ticket-window", "width=380,height=600");
    if (!printWindow) {
      throw new Error("No se pudo abrir la ventana de impresi�n. Verifica los permisos de tu navegador.");
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };
  return {
    async getBrowserPrinters() {
      const printers = [defaultBrowserPrinter];
      if ("bluetooth" in navigator) {
        printers.push({
          id: "browser-bluetooth",
          name: "Dispositivo Bluetooth",
          type: "network",
          status: "unknown",
          capabilities: ["ticket"]
        });
      }
      if ("usb" in navigator) {
        printers.push({
          id: "browser-usb",
          name: "Adaptador USB/Serial",
          type: "system",
          status: "unknown",
          capabilities: ["ticket"]
        });
      }
      return printers;
    },
    async printSaleTicket(options) {
      const { sale, organization, printerSettings, overridePrinterId, layoutOverride } = options;
      if (!organization) return;
      const printerId = overridePrinterId || printerSettings?.defaultPrinterId;
      const selectedPrinter = printerSettings?.availablePrinters?.find((p) => p.id === printerId) || defaultBrowserPrinter;
      console.info(`Enviando ticket al dispositivo: ${selectedPrinter.name}`);
      const html = buildTicketHtml(sale, organization, { layoutOverride, variant: "print" });
      openPrintWindow(html);
    }
  };
};

const mapComboFromDb = (data) => ({
  id: data.id,
  sku: data.sku,
  name: data.name,
  organizationId: data.organization_id,
  isActive: data.is_active,
  suggestedPrice: parseFloat(data.suggested_price) || 0,
  finalPrice: parseFloat(data.final_price) || 0,
  costPrice: parseFloat(data.cost_price) || 0,
  profitMargin: data.profit_margin ? parseFloat(data.profit_margin) : void 0,
  components: [],
  // Se llenará después
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at)
});
const mapComboComponentFromDb = (data) => ({
  id: data.id,
  comboId: data.combo_id,
  productId: data.product_id,
  productSku: data.product_sku,
  quantity: parseFloat(data.quantity) || 0,
  unitOfMeasure: data.unit_of_measure,
  isRequired: data.is_required ?? true,
  saleOption: data.sale_option
});
const createComboService = (orgId) => {
  const service = {
    /**
     * Obtiene todos los combos de la organización
     */
    getAllCombos: async () => {
      const { data, error } = await supabase.from("product_combos").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      const combos = (data || []).map(mapComboFromDb);
      for (const combo of combos) {
        const { data: componentsData, error: componentsError } = await supabase.from("product_combo_components").select("*").eq("combo_id", combo.id);
        if (componentsError) {
          console.error("Error fetching combo components:", componentsError);
          continue;
        }
        combo.components = (componentsData || []).map(mapComboComponentFromDb);
      }
      return combos;
    },
    /**
     * Obtiene un combo por ID
     */
    getComboById: async (id) => {
      const { data, error } = await supabase.from("product_combos").select("*").eq("id", id).eq("organization_id", orgId).single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      const combo = mapComboFromDb(data);
      const { data: componentsData, error: componentsError } = await supabase.from("product_combo_components").select("*").eq("combo_id", combo.id);
      if (componentsError) {
        console.error("Error fetching combo components:", componentsError);
      } else {
        combo.components = (componentsData || []).map(mapComboComponentFromDb);
      }
      return combo;
    },
    /**
     * Obtiene un combo por SKU
     */
    getComboBySku: async (sku) => {
      const { data, error } = await supabase.from("product_combos").select("*").eq("sku", sku).eq("organization_id", orgId).eq("is_active", true).single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      const combo = mapComboFromDb(data);
      const { data: componentsData, error: componentsError } = await supabase.from("product_combo_components").select("*").eq("combo_id", combo.id);
      if (componentsError) {
        console.error("Error fetching combo components:", componentsError);
      } else {
        combo.components = (componentsData || []).map(mapComboComponentFromDb);
      }
      return combo;
    },
    /**
     * Calcula el precio sugerido y costo de un combo basado en sus componentes
     */
    calculateComboPrices: async (components) => {
      let suggestedPrice = 0;
      let costPrice = 0;
      for (const component of components) {
        const { data: product, error } = await supabase.from("ryze_products").select("price, cost_price, fractional_enabled, fractional_price, fractional_units_per_package").eq("id", component.productId).eq("organization_id", orgId).single();
        if (error || !product) {
          console.warn(`Product ${component.productId} not found, skipping`);
          continue;
        }
        let unitPrice = 0;
        if (component.saleOption === "fraction" && product.fractional_enabled) {
          if (product.fractional_price) {
            unitPrice = product.fractional_price;
          } else {
            const unitsPerPackage = product.fractional_units_per_package || 1;
            unitPrice = (product.price || 0) / unitsPerPackage;
          }
        } else {
          unitPrice = product.price || 0;
        }
        const componentPrice = unitPrice * component.quantity;
        const componentCost = (product.cost_price || 0) * component.quantity;
        suggestedPrice += componentPrice;
        costPrice += componentCost;
      }
      return { suggestedPrice, costPrice };
    },
    /**
     * Crea un nuevo combo
     */
    createCombo: async (input) => {
      if (!input.components || input.components.length === 0) {
        throw new Error("Un combo debe tener al menos un componente");
      }
      const existing = await service.getComboBySku(input.sku);
      if (existing) {
        throw new Error("Ya existe un combo con este SKU");
      }
      const { suggestedPrice, costPrice } = await (void 0).calculateComboPrices(input.components);
      const profitMargin = input.finalPrice > 0 ? (input.finalPrice - costPrice) / input.finalPrice * 100 : 0;
      const { data: comboData, error: comboError } = await supabase.from("product_combos").insert({
        organization_id: orgId,
        sku: input.sku,
        name: input.name,
        suggested_price: suggestedPrice,
        final_price: input.finalPrice,
        cost_price: costPrice,
        profit_margin: profitMargin,
        is_active: true
      }).select("*").single();
      if (comboError) throw comboError;
      const combo = mapComboFromDb(comboData);
      const componentsToInsert = input.components.map((comp, idx) => {
        if (!comp.productId || !comp.productSku) {
          throw new Error(`El componente ${idx + 1} no tiene un producto válido`);
        }
        if (!comp.quantity || comp.quantity <= 0) {
          throw new Error(`El componente ${idx + 1} debe tener una cantidad mayor a 0`);
        }
        if (!comp.unitOfMeasure) {
          throw new Error(`El componente ${idx + 1} debe tener una unidad de medida`);
        }
        return {
          combo_id: combo.id,
          organization_id: orgId,
          product_id: comp.productId,
          product_sku: comp.productSku,
          quantity: comp.quantity,
          unit_of_measure: comp.unitOfMeasure,
          sale_option: comp.saleOption || "package",
          is_required: comp.isRequired ?? true
        };
      });
      const { error: componentsError } = await supabase.from("product_combo_components").insert(componentsToInsert);
      if (componentsError) {
        await supabase.from("product_combos").delete().eq("id", combo.id);
        throw componentsError;
      }
      return await service.getComboById(combo.id) || combo;
    },
    /**
     * Actualiza un combo existente
     */
    updateCombo: async (id, input) => {
      const updateData = {};
      if (input.name !== void 0) updateData.name = input.name;
      if (input.isActive !== void 0) updateData.is_active = input.isActive;
      if (input.components || input.finalPrice !== void 0) {
        const currentCombo = await service.getComboById(id);
        if (!currentCombo) throw new Error("Combo not found");
        const components = input.components || currentCombo.components.map((c) => ({
          productId: c.productId,
          productSku: c.productSku,
          quantity: c.quantity,
          unitOfMeasure: c.unitOfMeasure,
          saleOption: c.saleOption,
          isRequired: c.isRequired
        }));
        const { suggestedPrice, costPrice } = await (void 0).calculateComboPrices(components);
        updateData.suggested_price = suggestedPrice;
        updateData.cost_price = costPrice;
        if (input.finalPrice !== void 0) {
          updateData.final_price = input.finalPrice;
          updateData.profit_margin = (input.finalPrice - costPrice) / input.finalPrice * 100;
        } else {
          updateData.profit_margin = (currentCombo.finalPrice - costPrice) / currentCombo.finalPrice * 100;
        }
        if (input.components) {
          await supabase.from("product_combo_components").delete().eq("combo_id", id);
          const componentsToInsert = input.components.map((comp) => ({
            combo_id: id,
            organization_id: orgId,
            product_id: comp.productId,
            product_sku: comp.productSku,
            quantity: comp.quantity,
            unit_of_measure: comp.unitOfMeasure,
            sale_option: comp.saleOption || "package",
            is_required: comp.isRequired ?? true
          }));
          const { error: componentsError } = await supabase.from("product_combo_components").insert(componentsToInsert);
          if (componentsError) throw componentsError;
        }
      } else if (input.finalPrice !== void 0) {
        const currentCombo = await service.getComboById(id);
        if (!currentCombo) throw new Error("Combo not found");
        updateData.final_price = input.finalPrice;
        updateData.profit_margin = (input.finalPrice - currentCombo.costPrice) / input.finalPrice * 100;
      }
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from("product_combos").update(updateData).eq("id", id).eq("organization_id", orgId);
        if (error) throw error;
      }
      return await service.getComboById(id) || {};
    },
    /**
     * Elimina un combo
     */
    deleteCombo: async (id) => {
      const { error } = await supabase.from("product_combos").delete().eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
    }
  };
  return service;
};

const mapPromotionFromDb = (data) => ({
  id: data.id,
  sku: data.sku,
  name: data.name,
  organizationId: data.organization_id,
  isActive: data.is_active,
  promotionType: data.promotion_type,
  promotionValue: parseFloat(data.promotion_value) || 0,
  startDate: data.start_date ? new Date(data.start_date) : void 0,
  endDate: data.end_date ? new Date(data.end_date) : void 0,
  isScheduled: data.is_scheduled ?? false,
  suggestedPrice: parseFloat(data.suggested_price) || 0,
  finalPrice: parseFloat(data.final_price) || 0,
  costPrice: parseFloat(data.cost_price) || 0,
  profitMargin: data.profit_margin ? parseFloat(data.profit_margin) : void 0,
  originalPrice: parseFloat(data.original_price) || 0,
  totalUnitsSold: data.total_units_sold ? parseFloat(data.total_units_sold) : void 0,
  applyToSeparateProducts: data.apply_to_separate_products ?? false,
  components: [],
  // Se llenará después
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at)
});
const mapPromotionComponentFromDb = (data) => ({
  id: data.id,
  promotionId: data.promotion_id,
  productId: data.product_id,
  productSku: data.product_sku,
  quantity: parseFloat(data.quantity) || 0,
  unitOfMeasure: data.unit_of_measure,
  saleOption: data.sale_option
});
const createPromotionService = (orgId) => {
  return {
    /**
     * Obtiene todas las promociones activas de la organización
     */
    getActivePromotions: async () => {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data, error } = await supabase.from("product_promotions").select("*").eq("organization_id", orgId).eq("is_active", true).or(`is_scheduled.eq.false,and(is_scheduled.eq.true,start_date.lte.${now},end_date.gte.${now})`).order("created_at", { ascending: false });
      if (error) throw error;
      const promotions = (data || []).map(mapPromotionFromDb);
      for (const promotion of promotions) {
        const { data: componentsData, error: componentsError } = await supabase.from("product_promotion_components").select("*").eq("promotion_id", promotion.id);
        if (componentsError) {
          console.error("Error fetching promotion components:", componentsError);
          continue;
        }
        promotion.components = (componentsData || []).map(mapPromotionComponentFromDb);
      }
      return promotions;
    },
    /**
     * Obtiene todas las promociones (activas e inactivas)
     */
    getAllPromotions: async () => {
      const { data, error } = await supabase.from("product_promotions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      const promotions = (data || []).map(mapPromotionFromDb);
      for (const promotion of promotions) {
        const { data: componentsData, error: componentsError } = await supabase.from("product_promotion_components").select("*").eq("promotion_id", promotion.id);
        if (componentsError) {
          console.error("Error fetching promotion components:", componentsError);
          continue;
        }
        promotion.components = (componentsData || []).map(mapPromotionComponentFromDb);
      }
      return promotions;
    },
    /**
     * Obtiene una promoción por ID
     */
    getPromotionById: async (id) => {
      const { data, error } = await supabase.from("product_promotions").select("*").eq("id", id).eq("organization_id", orgId).single();
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      const promotion = mapPromotionFromDb(data);
      const { data: componentsData, error: componentsError } = await supabase.from("product_promotion_components").select("*").eq("promotion_id", promotion.id);
      if (componentsError) {
        console.error("Error fetching promotion components:", componentsError);
      } else {
        promotion.components = (componentsData || []).map(mapPromotionComponentFromDb);
      }
      return promotion;
    },
    /**
     * Obtiene promociones que aplican a productos específicos (para detección en carrito)
     */
    getPromotionsForProducts: async (productSkus) => {
      if (productSkus.length === 0) return [];
      const activePromotions = await (void 0).getActivePromotions();
      return activePromotions.filter((promo) => {
        if (!promo.applyToSeparateProducts) return false;
        const promoSkus = promo.components.map((c) => c.productSku);
        return promoSkus.every((sku) => productSkus.includes(sku));
      });
    },
    /**
     * Calcula el precio con descuento según el tipo de promoción
     */
    calculatePromotionPrice: (originalPrice, promotionType, promotionValue) => {
      switch (promotionType) {
        case "2x1":
          return originalPrice;
        case "3x2":
          return originalPrice * 2 / 3;
        case "percentage":
          return originalPrice * (1 - promotionValue / 100);
        case "fixed_discount":
          return Math.max(0, originalPrice - promotionValue);
        default:
          return originalPrice;
      }
    },
    /**
     * Calcula precios sugeridos y costos de una promoción
     */
    calculatePromotionPrices: async (components, promotionType, promotionValue) => {
      let originalPrice = 0;
      let costPrice = 0;
      for (const component of components) {
        const { data: product, error } = await supabase.from("ryze_products").select("price, cost_price, fractional_enabled, fractional_price, fractional_units_per_package").eq("id", component.productId).eq("organization_id", orgId).single();
        if (error || !product) {
          console.warn(`Product ${component.productId} not found, skipping`);
          continue;
        }
        let unitPrice = 0;
        if (component.saleOption === "fraction" && product.fractional_enabled) {
          if (product.fractional_price) {
            unitPrice = product.fractional_price;
          } else {
            const unitsPerPackage = product.fractional_units_per_package || 1;
            unitPrice = (product.price || 0) / unitsPerPackage;
          }
        } else {
          unitPrice = product.price || 0;
        }
        originalPrice += unitPrice * component.quantity;
        costPrice += (product.cost_price || 0) * component.quantity;
      }
      const suggestedPrice = (void 0).calculatePromotionPrice(originalPrice, promotionType, promotionValue);
      return { originalPrice, suggestedPrice, costPrice };
    },
    /**
     * Crea una nueva promoción
     */
    createPromotion: async (input) => {
      const { originalPrice, suggestedPrice, costPrice } = await (void 0).calculatePromotionPrices(
        input.components,
        input.promotionType,
        input.promotionValue
      );
      const finalPrice = input.finalPrice || suggestedPrice;
      const profitMargin = finalPrice > 0 ? (finalPrice - costPrice) / finalPrice * 100 : 0;
      const { data: promotionData, error: promotionError } = await supabase.from("product_promotions").insert({
        organization_id: orgId,
        sku: input.sku,
        name: input.name,
        promotion_type: input.promotionType,
        promotion_value: input.promotionValue,
        start_date: input.startDate?.toISOString(),
        end_date: input.endDate?.toISOString(),
        is_scheduled: input.isScheduled ?? false,
        suggested_price: suggestedPrice,
        final_price: finalPrice,
        cost_price: costPrice,
        profit_margin: profitMargin,
        original_price: originalPrice,
        apply_to_separate_products: input.applyToSeparateProducts ?? false,
        is_active: true
      }).select("*").single();
      if (promotionError) throw promotionError;
      const promotion = mapPromotionFromDb(promotionData);
      const componentsToInsert = input.components.map((comp) => ({
        promotion_id: promotion.id,
        organization_id: orgId,
        product_id: comp.productId,
        product_sku: comp.productSku,
        quantity: comp.quantity,
        unit_of_measure: comp.unitOfMeasure,
        sale_option: comp.saleOption || "package"
      }));
      const { error: componentsError } = await supabase.from("product_promotion_components").insert(componentsToInsert);
      if (componentsError) {
        await supabase.from("product_promotions").delete().eq("id", promotion.id);
        throw componentsError;
      }
      return await (void 0).getPromotionById(promotion.id) || promotion;
    },
    /**
     * Actualiza una promoción existente
     */
    updatePromotion: async (id, input) => {
      const updateData = {};
      if (input.name !== void 0) updateData.name = input.name;
      if (input.isActive !== void 0) updateData.is_active = input.isActive;
      if (input.promotionType !== void 0) updateData.promotion_type = input.promotionType;
      if (input.promotionValue !== void 0) updateData.promotion_value = input.promotionValue;
      if (input.startDate !== void 0) updateData.start_date = input.startDate?.toISOString();
      if (input.endDate !== void 0) updateData.end_date = input.endDate?.toISOString();
      if (input.isScheduled !== void 0) updateData.is_scheduled = input.isScheduled;
      if (input.applyToSeparateProducts !== void 0) updateData.apply_to_separate_products = input.applyToSeparateProducts;
      if (input.components || input.promotionType || input.promotionValue !== void 0) {
        const currentPromo = await (void 0).getPromotionById(id);
        if (!currentPromo) throw new Error("Promotion not found");
        const components = input.components || currentPromo.components.map((c) => ({
          productId: c.productId,
          productSku: c.productSku,
          quantity: c.quantity,
          unitOfMeasure: c.unitOfMeasure,
          saleOption: c.saleOption
        }));
        const promotionType = input.promotionType || currentPromo.promotionType;
        const promotionValue = input.promotionValue ?? currentPromo.promotionValue;
        const { originalPrice, suggestedPrice, costPrice } = await (void 0).calculatePromotionPrices(
          components,
          promotionType,
          promotionValue
        );
        updateData.original_price = originalPrice;
        updateData.suggested_price = suggestedPrice;
        updateData.cost_price = costPrice;
        if (input.finalPrice !== void 0) {
          updateData.final_price = input.finalPrice;
          updateData.profit_margin = (input.finalPrice - costPrice) / input.finalPrice * 100;
        } else {
          updateData.final_price = suggestedPrice;
          updateData.profit_margin = (suggestedPrice - costPrice) / suggestedPrice * 100;
        }
        if (input.components) {
          await supabase.from("product_promotion_components").delete().eq("promotion_id", id);
          const componentsToInsert = input.components.map((comp) => ({
            promotion_id: id,
            organization_id: orgId,
            product_id: comp.productId,
            product_sku: comp.productSku,
            quantity: comp.quantity,
            unit_of_measure: comp.unitOfMeasure,
            sale_option: comp.saleOption || "package"
          }));
          const { error: componentsError } = await supabase.from("product_promotion_components").insert(componentsToInsert);
          if (componentsError) throw componentsError;
        }
      } else if (input.finalPrice !== void 0) {
        const currentPromo = await (void 0).getPromotionById(id);
        if (!currentPromo) throw new Error("Promotion not found");
        updateData.final_price = input.finalPrice;
        updateData.profit_margin = (input.finalPrice - currentPromo.costPrice) / input.finalPrice * 100;
      }
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.from("product_promotions").update(updateData).eq("id", id).eq("organization_id", orgId);
        if (error) throw error;
      }
      return await (void 0).getPromotionById(id) || {};
    },
    /**
     * Elimina una promoción
     */
    deletePromotion: async (id) => {
      const { error } = await supabase.from("product_promotions").delete().eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
    },
    /**
     * Actualiza el contador de unidades vendidas
     */
    incrementUnitsSold: async (id, quantity = 1) => {
      const { error } = await supabase.rpc("increment_promotion_units_sold", {
        p_promotion_id: id,
        p_quantity: quantity
      });
      if (error) {
        const current = await (void 0).getPromotionById(id);
        if (current) {
          await supabase.from("product_promotions").update({ total_units_sold: (current.totalUnitsSold || 0) + quantity }).eq("id", id);
        }
      }
    }
  };
};

const mapSubSkuFromDb = (data) => ({
  id: data.id,
  parentProductId: data.parent_product_id,
  parentSku: "",
  // Se llenará después
  subSku: data.sub_sku,
  fractionalQuantity: parseFloat(data.fractional_quantity) || 0,
  price: parseFloat(data.price) || 0,
  isActive: data.is_active ?? true
});
const createSubSkuService = (orgId) => {
  const getSubSkusByProduct = async (productId) => {
    const { data, error } = await supabase.from("product_fractional_subskus").select("*").eq("parent_product_id", productId).eq("organization_id", orgId).eq("is_active", true).order("fractional_quantity", { ascending: true });
    if (error) throw error;
    const subSkus = (data || []).map(mapSubSkuFromDb);
    const { data: product } = await supabase.from("ryze_products").select("id").eq("id", productId).eq("organization_id", orgId).single();
    if (product) {
      subSkus.forEach((subSku) => {
        subSku.parentSku = productId;
      });
    }
    return subSkus;
  };
  const getSubSkuBySku = async (subSku) => {
    const { data, error } = await supabase.from("product_fractional_subskus").select("*").eq("sub_sku", subSku).eq("organization_id", orgId).eq("is_active", true).single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    const mapped = mapSubSkuFromDb(data);
    const { data: product } = await supabase.from("ryze_products").select("id").eq("id", data.parent_product_id).eq("organization_id", orgId).single();
    if (product) {
      mapped.parentSku = product.id;
    }
    return mapped;
  };
  const generateSubSkusManually = async (productId) => {
    const { data: product, error: productError } = await supabase.from("ryze_products").select("id, fractional_enabled, fractional_unit_name, fractional_units_per_package, fractional_price, price").eq("id", productId).eq("organization_id", orgId).single();
    if (productError || !product) {
      throw new Error("Product not found");
    }
    if (!product.fractional_enabled || !product.fractional_units_per_package) {
      return [];
    }
    const unitName = product.fractional_unit_name || "pieza";
    const unitsPerPackage = product.fractional_units_per_package;
    const basePrice = product.price || 0;
    const fractionalPrice = product.fractional_price;
    const unitAbbrev = unitName.toLowerCase().includes("litro") ? "lt" : unitName.toLowerCase().includes("pieza") ? "pz" : unitName.toLowerCase().includes("metro") ? "m" : unitName.toLowerCase().includes("kilo") ? "kg" : unitName.substring(0, 2).toLowerCase();
    const quantities = [1, 2, 5, 10].filter((q) => q <= unitsPerPackage);
    const subSkusToInsert = [];
    for (const quantity of quantities) {
      const subSku = `${productId}_${quantity}${unitAbbrev}`;
      let price = 0;
      if (fractionalPrice && fractionalPrice > 0) {
        price = fractionalPrice * quantity;
      } else {
        price = basePrice / unitsPerPackage * quantity;
      }
      subSkusToInsert.push({
        organization_id: orgId,
        parent_product_id: productId,
        sub_sku: subSku,
        fractional_quantity: quantity,
        price,
        is_active: true
      });
    }
    for (const subSku of subSkusToInsert) {
      const { error } = await supabase.from("product_fractional_subskus").upsert(subSku, {
        onConflict: "organization_id,sub_sku"
      });
      if (error) {
        console.error("Error inserting subSKU:", error);
      }
    }
    return await getSubSkusByProduct(productId);
  };
  const generateSubSkus = async (productId) => {
    const { error } = await supabase.rpc("generate_fractional_subskus", {
      p_product_id: productId,
      p_organization_id: orgId
    });
    if (error) {
      console.warn("RPC function not available, generating manually");
      return await generateSubSkusManually(productId);
    }
    return await getSubSkusByProduct(productId);
  };
  const deactivateSubSkus = async (productId) => {
    const { error } = await supabase.from("product_fractional_subskus").update({ is_active: false }).eq("parent_product_id", productId).eq("organization_id", orgId);
    if (error) throw error;
  };
  const deleteSubSkus = async (productId) => {
    const { error } = await supabase.from("product_fractional_subskus").delete().eq("parent_product_id", productId).eq("organization_id", orgId);
    if (error) throw error;
  };
  return {
    getSubSkusByProduct,
    getSubSkuBySku,
    generateSubSkus,
    generateSubSkusManually,
    deactivateSubSkus,
    deleteSubSkus
  };
};

const mapCacheFromDb = (data) => ({
  totalProducts: data.total_products || 0,
  totalInventoryUnits: parseFloat(data.total_inventory_units) || 0,
  inventoryValueAtCost: parseFloat(data.inventory_value_at_cost) || 0,
  inventoryValueAtPrice: parseFloat(data.inventory_value_at_price) || 0,
  lowStockCount: data.low_stock_count || 0,
  totalSalesCount: data.total_sales_count || 0,
  totalRevenue: parseFloat(data.total_revenue) || 0,
  totalCostOfGoods: parseFloat(data.total_cost_of_goods) || 0,
  grossProfit: parseFloat(data.gross_profit) || 0,
  netProfit: parseFloat(data.net_profit) || 0,
  averageSaleAmount: parseFloat(data.average_sale_amount) || 0,
  bestSellers: data.best_sellers || [],
  mostProfitable: data.most_profitable || [],
  lastUpdated: new Date(data.last_updated)
});
const createAIDataCacheService = (orgId) => {
  const refreshCache = async () => {
    const { error: invError } = await supabase.rpc("update_inventory_cache", {
      p_org_id: orgId
    });
    if (invError) {
      console.error("Error updating inventory cache:", invError);
    }
    const { error: salesError } = await supabase.rpc("update_sales_cache", {
      p_org_id: orgId
    });
    if (salesError) {
      console.error("Error updating sales cache:", salesError);
    }
  };
  const getCache = async (forceRefresh = false) => {
    const { data, error } = await supabase.from("organization_ai_data_cache").select("*").eq("organization_id", orgId).single();
    if (error) {
      if (error.code === "PGRST116") {
        await refreshCache();
        return await getCache(false);
      }
      throw error;
    }
    const cache = mapCacheFromDb(data);
    const now = /* @__PURE__ */ new Date();
    const ageInHours = (now.getTime() - cache.lastUpdated.getTime()) / (1e3 * 60 * 60);
    if (forceRefresh || ageInHours > 1) {
      await refreshCache();
      return await getCache(false);
    }
    return cache;
  };
  return {
    /**
     * Obtiene el cache de datos agregados
     * Si no existe o está desactualizado (> 1 hora), lo actualiza primero
     */
    getCache,
    /**
     * Fuerza la actualización del cache
     */
    refreshCache,
    /**
     * Obtiene un resumen formateado para la IA
     */
    getFormattedSummary: async () => {
      const cache = await getCache();
      if (!cache) {
        return "No hay datos disponibles.";
      }
      return `
DATOS DEL INVENTARIO:
- Total de productos: ${cache.totalProducts.toLocaleString()}
- Unidades totales en inventario: ${cache.totalInventoryUnits.toLocaleString()}
- Valor del inventario a costo: $${cache.inventoryValueAtCost.toFixed(2)}
- Valor del inventario a precio de venta: $${cache.inventoryValueAtPrice.toFixed(2)}
- Productos con stock bajo: ${cache.lowStockCount}

DATOS DE VENTAS (últimos 30 días):
- Total de ventas: ${cache.totalSalesCount}
- Ingresos totales: $${cache.totalRevenue.toFixed(2)}
- Costo de productos vendidos: $${cache.totalCostOfGoods.toFixed(2)}
- Ganancia bruta: $${cache.grossProfit.toFixed(2)}
- Ganancia neta: $${cache.netProfit.toFixed(2)}
- Ticket promedio: $${cache.averageSaleAmount.toFixed(2)}

PRODUCTOS MÁS VENDIDOS:
${cache.bestSellers.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - ${p.quantity} unidades`).join("\n") || "Ninguno"}

PRODUCTOS MÁS RENTABLES:
${cache.mostProfitable.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} - Ganancia: $${p.profit.toFixed(2)}`).join("\n") || "Ninguno"}
            `.trim();
    }
  };
};

const mapAssetFromDb = (dbAsset) => ({
  id: dbAsset.id,
  symbol: dbAsset.symbol,
  name: dbAsset.name,
  category: dbAsset.category,
  type: dbAsset.asset_type,
  quantity: parseFloat(dbAsset.quantity),
  buyPrice: parseFloat(dbAsset.buy_price),
  currency: dbAsset.currency,
  purchaseDate: dbAsset.purchase_date,
  yieldRate: dbAsset.yield_rate ? parseFloat(dbAsset.yield_rate) : void 0,
  paymentFrequency: dbAsset.payment_frequency,
  depreciationRate: dbAsset.depreciation_rate ? parseFloat(dbAsset.depreciation_rate) : void 0,
  usagePrice: dbAsset.usage_price ? parseFloat(dbAsset.usage_price) : void 0,
  usageCount: dbAsset.usage_count || 0,
  accumulatedRevenue: dbAsset.accumulated_revenue ? parseFloat(dbAsset.accumulated_revenue) : 0,
  maintenanceCost: dbAsset.maintenance_cost ? parseFloat(dbAsset.maintenance_cost) : 0
});
const mapAssetToDb = (asset) => ({
  symbol: asset.symbol,
  name: asset.name,
  category: asset.category,
  asset_type: asset.type,
  quantity: asset.quantity,
  buy_price: asset.buyPrice,
  currency: asset.currency,
  purchase_date: asset.purchaseDate,
  yield_rate: asset.yieldRate,
  payment_frequency: asset.paymentFrequency,
  depreciation_rate: asset.depreciationRate,
  usage_price: asset.usagePrice,
  usage_count: asset.usageCount,
  accumulated_revenue: asset.accumulatedRevenue,
  maintenance_cost: asset.maintenanceCost
});
const mapMarketDataFromDb = (dbData) => ({
  symbol: dbData.symbol,
  currentPriceMXN: parseFloat(dbData.current_price_mxn),
  lastUpdated: dbData.last_updated,
  change24hPercent: dbData.change_24h_percent ? parseFloat(dbData.change_24h_percent) : void 0
});
const mapTransactionFromDb = (dbTx) => ({
  id: dbTx.id,
  assetId: dbTx.asset_id,
  date: dbTx.date,
  type: dbTx.type,
  amount: parseFloat(dbTx.amount),
  note: dbTx.note
});
const mapGoalFromDb = (dbGoal) => ({
  id: dbGoal.id,
  title: dbGoal.title,
  targetAmount: parseFloat(dbGoal.target_amount),
  deadline: dbGoal.deadline,
  linkedToTotal: dbGoal.linked_to_total,
  currentSaved: dbGoal.current_saved ? parseFloat(dbGoal.current_saved) : 0
});
const createPortfolioService = (orgId) => {
  return {
    // Assets
    getAssets: async () => {
      const { data, error } = await supabase.from("ryze_portfolio_assets").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapAssetFromDb);
    },
    saveAsset: async (assetData) => {
      const payload = mapAssetToDb(assetData);
      if (assetData.id) {
        const { data, error } = await supabase.from("ryze_portfolio_assets").update(payload).eq("id", assetData.id).select().single();
        if (error) throw error;
        return mapAssetFromDb(data);
      } else {
        const { data, error } = await supabase.from("ryze_portfolio_assets").insert({ ...payload, organization_id: orgId }).select().single();
        if (error) throw error;
        return mapAssetFromDb(data);
      }
    },
    deleteAsset: async (id) => {
      await supabase.from("ryze_portfolio_transactions").delete().eq("asset_id", id);
      const { error } = await supabase.from("ryze_portfolio_assets").delete().eq("id", id);
      if (error) throw error;
    },
    // Market Data
    getMarketData: async (symbols) => {
      let query = supabase.from("ryze_market_data").select("*").eq("organization_id", orgId);
      if (symbols && symbols.length > 0) {
        query = query.in("symbol", symbols);
      }
      const { data, error } = await query;
      if (error) throw error;
      const result = {};
      (data || []).forEach((item) => {
        result[item.symbol] = mapMarketDataFromDb(item);
      });
      return result;
    },
    saveMarketData: async (marketData) => {
      const { error } = await supabase.from("ryze_market_data").upsert({
        organization_id: orgId,
        symbol: marketData.symbol,
        current_price_mxn: marketData.currentPriceMXN,
        change_24h_percent: marketData.change24hPercent,
        last_updated: marketData.lastUpdated
      }, {
        onConflict: "organization_id,symbol"
      });
      if (error) throw error;
    },
    // Transactions
    getTransactions: async (assetId) => {
      let query = supabase.from("ryze_portfolio_transactions").select("*").eq("organization_id", orgId).order("date", { ascending: false });
      if (assetId) {
        query = query.eq("asset_id", assetId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapTransactionFromDb);
    },
    addTransaction: async (transaction) => {
      const { data, error } = await supabase.from("ryze_portfolio_transactions").insert({
        organization_id: orgId,
        asset_id: transaction.assetId,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        note: transaction.note
      }).select().single();
      if (error) throw error;
      return mapTransactionFromDb(data);
    },
    // Goals
    getGoals: async () => {
      const { data, error } = await supabase.from("ryze_investment_goals").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapGoalFromDb);
    },
    saveGoal: async (goalData) => {
      const payload = {
        title: goalData.title,
        target_amount: goalData.targetAmount,
        deadline: goalData.deadline,
        linked_to_total: goalData.linkedToTotal ?? false,
        current_saved: goalData.currentSaved ?? 0
      };
      if (goalData.id) {
        const { data, error } = await supabase.from("ryze_investment_goals").update(payload).eq("id", goalData.id).select().single();
        if (error) throw error;
        return mapGoalFromDb(data);
      } else {
        const { data, error } = await supabase.from("ryze_investment_goals").insert({ ...payload, organization_id: orgId }).select().single();
        if (error) throw error;
        return mapGoalFromDb(data);
      }
    },
    deleteGoal: async (id) => {
      const { error } = await supabase.from("ryze_investment_goals").delete().eq("id", id);
      if (error) throw error;
    }
  };
};

const createGeminiPortfolioService = () => {
  return {
    fetchMarketPrices: async (symbols) => {
      symbols.map((s) => ({
        id: "",
        symbol: s,
        category: "Mercado (Bolsa/Cripto/Fibras)",
        type: "Acción (EE.UU.)",
        quantity: 1,
        buyPrice: 0,
        currency: "MXN",
        purchaseDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      }));
      await fetchMarketPrices();
    },
    fetchAssetDetails,
    initChatSession: (portfolio) => {
      if (typeof window !== "undefined") {
        window.__portfolioChatContext = portfolio;
      }
    },
    sendMessageToChat: async (message, portfolio) => {
      return sendPortfolioChatMessage();
    }
  };
};
const fetchMarketPrices = async (assets) => {
  {
    console.warn("[Gemini] API key no configurada");
    return [];
  }
};
const fetchAssetDetails = async (symbol) => {
  return null;
};
const sendPortfolioChatMessage = async (message, portfolio) => {
  {
    return "Lo siento, el servicio de IA no está configurado.";
  }
};

const geminiPortfolioService = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    createGeminiPortfolioService,
    fetchAssetDetails,
    fetchMarketPrices,
    sendPortfolioChatMessage
}, Symbol.toStringTag, { value: 'Module' }));

const ServiceContext = reactExports.createContext(void 0);
const useServices = () => {
  const context = reactExports.useContext(ServiceContext);
  if (!context) {
    throw new Error("useServices must be used within a ServiceProvider");
  }
  return context;
};
const ServiceProvider = ({ children, orgId }) => {
  const services = reactExports.useMemo(() => {
    const inventoryService = createInventoryService(orgId);
    const employeeService = createEmployeeService(orgId);
    const clientService = createClientService(orgId);
    const providerService = createProviderService(orgId);
    const expenseService = createExpenseService(orgId);
    const quoteService = createQuoteService(orgId);
    const marketingService = createMarketingService(orgId);
    const investmentService = createInvestmentService(orgId);
    const timeClockService = createTimeClockService(orgId);
    const roleService = createRoleService(orgId);
    const commissionService = createCommissionService(orgId);
    const priceListService = createPriceListService(orgId);
    const ticketService = createTicketService();
    const comboService = createComboService(orgId);
    const promotionService = createPromotionService(orgId);
    const subSkuService = createSubSkuService(orgId);
    const aiDataCacheService = createAIDataCacheService(orgId);
    const inventoryCountService = createInventoryCountService(orgId);
    const portfolioService = createPortfolioService(orgId);
    const saleService = createSaleService(orgId, commissionService, employeeService);
    const cashRegisterService = createCashRegisterService(orgId);
    const purchaseService = createPurchaseService(orgId, inventoryService);
    const payrollService = createPayrollService(orgId, expenseService, commissionService);
    return {
      inventoryService,
      saleService,
      cashRegisterService,
      employeeService,
      clientService,
      providerService,
      purchaseService,
      expenseService,
      quoteService,
      marketingService,
      investmentService,
      payrollService,
      timeClockService,
      roleService,
      commissionService,
      priceListService,
      ticketService,
      comboService,
      promotionService,
      subSkuService,
      aiDataCacheService,
      inventoryCountService,
      portfolioService,
      geminiPortfolioService: createGeminiPortfolioService()
    };
  }, [orgId]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ServiceContext.Provider, { value: services, children });
};

function usePersistentState(key, initialValue) {
  const readStoredValue = () => {
    const stored = getLocalStorageItem(key);
    return stored !== null ? stored : initialValue;
  };
  const [storedValue, setStoredValue] = reactExports.useState(readStoredValue);
  reactExports.useEffect(() => {
    const unsubscribe = subscribeToLocalStorage(key, (value) => {
      if (value !== null) {
        setStoredValue(value);
      } else {
        const current = getLocalStorageItem(key);
        if (current !== null) {
          setStoredValue(current);
        }
      }
    });
    return unsubscribe;
  }, [key]);
  reactExports.useEffect(() => {
    setStoredValue(readStoredValue());
  }, [key]);
  const setValue = reactExports.useCallback(
    (value) => {
      setStoredValue((prevValue) => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        setLocalStorageItem(key, valueToStore);
        return valueToStore;
      });
    },
    [key]
  );
  return [storedValue, setValue];
}

const __vite_import_meta_env__ = {};
const STRIPE_FEATURES_DISABLED = __vite_import_meta_env__?.VITE_DISABLE_STRIPE === "true";
const callOpenAI = async (prompt, systemInstruction, jsonMode = false) => {
  try {
    const { data, error } = await supabase.functions.invoke("openai-proxy", {
      body: {
        prompt,
        systemInstruction,
        jsonMode,
        model: "gpt-4o-mini"
        // Modelo rápido y eficiente
      }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data.content;
  } catch (error) {
    console.error("Error calling OpenAI proxy function:", error);
    if (error instanceof Error) {
      return `Error al contactar la IA: ${error.message}`;
    }
    return "Ocurrió un error inesperado al contactar la IA.";
  }
};
const getBusinessSnapshotSummary = async (allSales) => {
  const salesCount = allSales.length;
  const totalRevenue = allSales.reduce((sum, sale) => sum + sale.total, 0);
  const prompt = `Analiza el estado general de este negocio basado en sus ventas históricas (Total Ingresos: $${totalRevenue.toFixed(2)} MXN, Total Ventas: ${salesCount}). Observa tendencias, estacionalidad o posibles áreas de oportunidad. Proporciona un resumen conciso en 3 o 4 puntos clave (usa '*' para viñetas). El análisis debe ser de aproximadamente 60-80 palabras en total. Enfócate en dar una perspectiva útil para el dueño del negocio.`;
  return callOpenAI(
    prompt,
    "Eres un analista de negocios experto para ferreterías. Das consejos estratégicos, concisos y directos basados en el panorama general."
  );
};
const detectUnitOfMeasure = async (productName, category) => {
  const units = ["pieza", "caja", "bolsa", "metro", "kg", "lt", "servicio", "horas"];
  const prompt = `Analiza el siguiente producto de ferretería y determina su unidad de medida más apropiada.

Producto: "${productName}"
${category ? `Categoría: "${category}"` : ""}

Unidades disponibles: ${units.join(", ")}

Reglas:
- Si es un líquido (alcohol, pintura, aceite, etc.) → "lt"
- Si es un material a granel (cemento, arena, etc.) → "kg"
- Si es un material largo (cable, manguera, varilla, etc.) → "metro"
- Si viene en paquetes o cajas → "caja" o "bolsa"
- Si es un servicio → "servicio"
- Si se cobra por tiempo → "horas"
- Por defecto → "pieza"

Responde SOLO con una de estas palabras: ${units.join(", ")}. Sin explicaciones, solo la palabra.`;
  try {
    const response = await callOpenAI(
      prompt,
      "Eres un experto en productos de ferretería y construcción. Conoces las unidades de medida estándar para cada tipo de producto.",
      false
    );
    const cleanResponse = response.trim().toLowerCase();
    const detectedUnit = units.find((unit) => cleanResponse.includes(unit));
    return detectedUnit || "pieza";
  } catch (error) {
    console.error("Error detecting unit of measure:", error);
    return "pieza";
  }
};
const getCrossSellSuggestion = async (productName, cartItems, tier, inventory) => {
  if (STRIPE_FEATURES_DISABLED) {
    console.debug("[cross-sell] skipped (VITE_DISABLE_STRIPE=true)");
    return "";
  }
  if (cartItems.length > 5) return "";
  let prompt;
  let systemInstruction = "Eres un asistente de ventas experto, especializado en ventas cruzadas.";
  if (tier === "solopreneur") {
    prompt = `Un cliente acaba de añadir el servicio/producto "${productName}" a su carrito, que ya contiene: ${cartItems.join(", ")}. Sugiere UN solo servicio o producto complementario relevante que el vendedor podría ofrecer. Puedes ser creativo pero mantente dentro del contexto de servicios profesionales o productos digitales. Responde solo con el nombre del producto o una frase muy corta. Ejemplo: "Una sesión de seguimiento" o "No olvides el paquete de branding".`;
  } else {
    const inventoryList = inventory.map((p) => p.name).join(", ");
    prompt = `Un cliente acaba de añadir "${productName}" a su carrito, que ya contiene: ${cartItems.join(", ")}. De la siguiente lista de productos disponibles en inventario, sugiere UN solo producto que sea el complemento más lógico para ofrecer. Si ningún producto de la lista es un buen complemento, responde con una cadena vacía.
Inventario disponible: [${inventoryList}]
Responde solo con el nombre exacto del producto del inventario, o nada.`;
    systemInstruction = "Eres un asistente de ventas de una ferretería. Tu ÚNICA tarea es identificar el mejor producto para venta cruzada de la lista de inventario proporcionada. DEBES responder únicamente con el nombre exacto de un producto de la lista. Si no hay una buena opción en la lista, DEBES responder con una cadena vacía. No inventes productos.";
  }
  return callOpenAI(prompt, systemInstruction);
};
const getProjectRecommendations = async (problem) => {
  const prompt = `Un cliente necesita ayuda con este problema: "${problem}". Recomienda una lista de tipos de productos de ferretería que podría necesitar. Formatea tu respuesta como un array JSON de strings. Ejemplo: ["Cinta de teflón", "Llave Stillson", "Empaques de hule"]`;
  const systemInstruction = "Eres un asistente de ferretería. Responde siempre con un array JSON de strings válido.";
  return callOpenAI(prompt, systemInstruction, true);
};
const getInventoryOptimizationSuggestion = async (query, products) => {
  const productData = products.slice(0, 50).map(
    (p) => ` - ${p.name} (Stock: ${p.stock ?? "N/A"}, Precio: $${p.price.toFixed(2)}, Costo: $${p.costPrice.toFixed(2)})`
  ).join("\n");
  const prompt = `Analiza la siguiente lista de productos de una ferretería y responde la pregunta del gerente.
Pregunta: "${query}"

Datos de Productos:
${productData}

Proporciona una respuesta clara, accionable y en formato markdown.`;
  return callOpenAI(prompt, "Eres un consultor de negocios experto en gestión de inventario y estrategias de venta para ferreterías.");
};
const analyzeBusinessGoals = async (goals, challenges, dataSummary, question) => {
  let prompt;
  const context = `
CONTEXTO DEL NEGOCIO:
- Metas: "${goals}"
- Desafíos: "${challenges}"

DATOS DE RENDIMIENTO (período seleccionado):
- Ingresos Totales: $${dataSummary.totalRevenue.toFixed(2)}
- Ganancia Bruta (Ventas - Costo): $${dataSummary.grossProfit.toFixed(2)}
- Ganancia Neta (Operativa): $${dataSummary.netProfit.toFixed(2)}
- Total de Ventas: ${dataSummary.totalSales}
- Ticket Promedio: $${dataSummary.averageSale.toFixed(2)}
- Total de Clientes: ${dataSummary.totalClients}
- Nuevos Clientes en el período: ${dataSummary.newClients}
- Productos más vendidos: ${dataSummary.bestSellers.join(", ") || "Ninguno"}
- Productos más rentables: ${dataSummary.mostProfitable.join(", ") || "Ninguno"}
`;
  if (!question) {
    prompt = `
${context}
---
TAREA:
Analiza los DATOS DE RENDIMIENTO en el CONTEXTO DEL NEGOCIO. Actúa como un consultor de negocios experto. Tu análisis debe ser:
1.  **Directo:** Comienza con una evaluación general de cómo el negocio está progresando hacia sus metas.
2.  **Específico:** Menciona 1-2 métricas clave que respalden tu evaluación (ej. "Estás avanzando en tu meta de rentabilidad, ya que tu ganancia neta es positiva en $X...").
3.  **Accionable:** Ofrece 2 recomendaciones concretas y creativas para acelerar el progreso hacia las metas o para superar los desafíos, basándote en los datos proporcionados.

Formatea tu respuesta en markdown.
`;
  } else {
    prompt = `
${context}
---
PREGUNTA DEL USUARIO: "${question}"
---
TAREA: Responde la PREGUNTA DEL USUARIO utilizando el CONTEXTO y los DATOS DE RENDIMIENTO proporcionados. Sé conciso y directo.`;
  }
  return callOpenAI(prompt, "Eres un consultor de negocios de élite, experto en analizar datos de pymes para ofrecer estrategias de crecimiento claras y accionables. Tu tono es profesional pero alentador.");
};
const generateInsight = (prompt) => {
  return callOpenAI(
    prompt,
    "Eres un asistente de negocios proactivo. Tus respuestas deben ser concisas, accionables y mantener un tono positivo y alentador."
  );
};
const generalChat = async (prompt, orgData, summaryData) => {
  let finalPrompt = prompt;
  let systemInstruction = "Eres un asistente de negocios útil y amigable para el dueño de un pequeño negocio. Sé conciso, directo y siempre responde en español.";
  if (orgData && summaryData) {
    systemInstruction = "Eres un asistente de negocios proactivo y experto que tiene acceso a los datos del negocio del usuario en tiempo real. Usa el contexto proporcionado para dar respuestas informadas y accionables. Sé conciso, directo y siempre responde en español.";
    finalPrompt = `
CONTEXTO DEL NEGOCIO (para tu conocimiento, no para mostrar al usuario a menos que sea relevante):
- Nombre: "${orgData.name}"
- Metas: "${orgData.goals || "No definidas"}"
- Desafíos: "${orgData.challenges || "No definidos"}"

DATOS DE RENDIMIENTO RECIENTES (del último mes o período relevante):
- Ingresos Totales: $${summaryData.totalRevenue.toFixed(2)}
- Ganancia Neta: $${summaryData.netProfit.toFixed(2)}
- Ventas Totales: ${summaryData.totalSales}
- Productos más vendidos: ${summaryData.bestSellers.join(", ") || "Ninguno"}

---
PREGUNTA DEL USUARIO: "${prompt}"
---
TAREA: Responde la PREGUNTA DEL USUARIO de forma concisa y útil. Si la pregunta es sobre el rendimiento del negocio (ej. "¿cómo vamos?", "¿qué se vendió más?"), basa tu respuesta en los DATOS DE RENDIMIENTO. Si es una pregunta general, responde normalmente.
`;
  }
  return callOpenAI(finalPrompt, systemInstruction);
};
const generateQuoteTerms = (businessType) => {
  const prompt = `Genera un texto de "Términos y Condiciones" breve y genérico para una cotización. El negocio es de tipo "${businessType}". Incluye puntos comunes como validez de la oferta (ej. 15 días), condiciones de pago y una nota sobre posibles cambios. Sé claro y conciso. Responde ÚNICAMENTE con el texto de los términos y condiciones, sin encabezados, introducciones, saludos, notas adicionales o separadores como '---'.`;
  const systemInstruction = "Eres un asistente legal que ayuda a pequeños negocios a redactar documentos simples.";
  return callOpenAI(prompt, systemInstruction);
};
const segmentClients = async (clients) => {
  const summary = {
    totalClients: clients.length,
    clientsWithPoints: clients.filter((c) => c.loyaltyPoints > 0).length,
    avgPoints: clients.length > 0 ? clients.reduce((sum, c) => sum + c.loyaltyPoints, 0) / clients.length : 0
  };
  const prompt = `Basado en este resumen de clientes de un pequeño negocio, identifica 2-3 segmentos de clientes clave para una campaña de marketing. 
Para cada segmento, proporciona un "name" (ej. 'Clientes Leales'), y una "description" breve (ej. 'Clientes que compran frecuentemente y usan puntos de lealtad').
Resumen: 
- Total de clientes: ${summary.totalClients}
- Clientes con puntos de lealtad: ${summary.clientsWithPoints}
- Promedio de puntos por cliente: ${summary.avgPoints.toFixed(0)}

Responde únicamente con un array JSON de objetos, cada uno con las claves "name" y "description".`;
  return callOpenAI(
    prompt,
    "Eres un experto en marketing y CRM para pequeños negocios. Tu respuesta DEBE ser un objeto JSON válido.",
    true
    // Enable JSON mode
  );
};
const generateCampaignContent = async (segmentName, campaignName) => {
  const prompt = `Genera contenido para una campaña de email marketing.
- Nombre de la campaña: "${campaignName}"
- Segmento de clientes objetivo: "${segmentName}"

Proporciona un "subject" (asunto del email) y un "body" (cuerpo del email). El cuerpo debe ser amigable, conciso y con un claro llamado a la acción.

Formatea tu respuesta como un objeto JSON con las claves "subject" y "body".`;
  return callOpenAI(
    prompt,
    "Eres un redactor publicitario (copywriter) experto en email marketing para pequeños negocios. Tu respuesta DEBE ser un objeto JSON válido.",
    true
    // Enable JSON mode
  );
};

const normalizeUnitKey = (unit) => {
  return unit ? unit.trim().toLowerCase() : "";
};
const normalizeThresholdMap = (map) => {
  const normalized = {};
  if (!map) return normalized;
  Object.entries(map).forEach(([key, value]) => {
    const normalizedKey = normalizeUnitKey(key);
    if (!normalizedKey) return;
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue >= 0) {
      normalized[normalizedKey] = numericValue;
    }
  });
  return normalized;
};
const isProductLowStock = (product, thresholds, defaultThreshold) => {
  if (product.unitOfMeasure === "servicio" || product.unitOfMeasure === "horas") {
    return false;
  }
  if (product.stock === void 0 || product.stock === null) {
    return false;
  }
  const primaryKey = normalizeUnitKey(product.unitOfMeasure);
  const primaryThreshold = thresholds[primaryKey] ?? defaultThreshold;
  if (!(primaryThreshold > 0)) {
    return false;
  }
  if (product.fractionalEnabled && product.fractionalUnitsPerPackage) {
    const total = product.stock;
    const packages = Math.floor(total / product.fractionalUnitsPerPackage);
    if (packages < primaryThreshold) {
      return true;
    }
    const fractionalKey = normalizeUnitKey(product.fractionalUnitName);
    const fractionalThreshold = fractionalKey ? thresholds[fractionalKey] : void 0;
    if (fractionalThreshold !== void 0) {
      const remainder = total % product.fractionalUnitsPerPackage;
      if (packages === 0 && remainder < fractionalThreshold) {
        return true;
      }
    }
    return false;
  }
  return product.stock < primaryThreshold;
};

const LOW_STOCK_CHECK_COOLDOWN = 12 * 60 * 60 * 1e3;
const CREDIT_ALERT_OFFSETS = [2, 1, 0];
const formatCurrency = (amount, currency) => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
const createInsightService = (orgId, inventoryService, purchaseService, lowStockThreshold, unitThresholds, currency = "MXN") => {
  const normalizedUnitThresholds = normalizeThresholdMap(unitThresholds);
  const hasCooldownPassed = async (key, cooldown) => {
    const { data, error } = await supabase.from("ryze_metadata").select("last_run").eq("id", key).eq("organization_id", orgId).limit(1);
    if (error) {
      console.error("Error checking cooldown:", error);
      return true;
    }
    if (!data || data.length === 0) return true;
    return Date.now() - new Date(data[0].last_run).getTime() > cooldown;
  };
  const updateCooldown = async (key) => {
    await supabase.from("ryze_metadata").upsert({
      id: key,
      organization_id: orgId,
      last_run: (/* @__PURE__ */ new Date()).toISOString()
    });
  };
  const metadataExists = async (key) => {
    const { data } = await supabase.from("ryze_metadata").select("id").eq("id", key).eq("organization_id", orgId).limit(1);
    return !!(data && data.length > 0);
  };
  const generateLowStockAlerts = async () => {
    if (!await hasCooldownPassed("lowStockCheck", LOW_STOCK_CHECK_COOLDOWN)) {
      console.log("Low stock check is on cooldown.");
      return;
    }
    const allProducts = await inventoryService.searchInventory("");
    const lowStockProducts = allProducts.filter(
      (p) => isProductLowStock(p, normalizedUnitThresholds, lowStockThreshold)
    );
    if (lowStockProducts.length > 0) {
      const { data: unreadNotifications, error } = await supabase.from("ryze_notifications").select("id").eq("read", false).ilike("title", "%Bajo Stock%").limit(1);
      if (error || unreadNotifications && unreadNotifications.length > 0) {
        console.log("Existing unread low stock notification found. Skipping new one.");
        return;
      }
      const productNames = lowStockProducts.map((p) => `${p.name} (${p.stock} restantes)`).join(", ");
      const prompt = `Los siguientes productos tienen bajo stock: ${productNames}. Escribe una alerta breve y amigable para el dueño del negocio, sugiriendo que es un buen momento para contactar a sus proveedores y reabastecer.`;
      const message = await generateInsight(prompt);
      await supabase.from("ryze_notifications").insert({
        title: `Alerta de Bajo Stock (${lowStockProducts.length} productos)`,
        message,
        type: "warning",
        read: false,
        organization_id: orgId
        // RLS FIX
      });
      await updateCooldown("lowStockCheck");
    }
  };
  const generateCreditAlerts = async () => {
    const purchases = await purchaseService.getPurchaseNotes();
    const actionable = purchases.filter(
      (p) => p.creditDays && p.creditDays > 0 && p.creditDueDate && !["Pagada", "Cancelada"].includes(p.status)
    );
    for (const purchase of actionable) {
      const dueDate = purchase.creditDueDate;
      const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1e3));
      const formatter = formatCurrency(purchase.total, currency);
      if (CREDIT_ALERT_OFFSETS.includes(diffDays)) {
        const stageKey = `creditAlert-${purchase.id}-d${diffDays}`;
        if (await metadataExists(stageKey)) continue;
        const human = diffDays === 0 ? "vence hoy" : diffDays === 1 ? "vence mañana" : `vence en ${diffDays} días`;
        await supabase.from("ryze_notifications").insert({
          title: `Crédito pendiente: ${purchase.providerName}`,
          message: `La compra ${purchase.id} ${human}. Total ${formatter}.`,
          type: diffDays <= 0 ? "warning" : "info",
          read: false,
          organization_id: orgId
        });
        await updateCooldown(stageKey);
      } else if (diffDays < 0) {
        const overdueKey = `creditAlert-${purchase.id}-overdue`;
        if (await metadataExists(overdueKey)) continue;
        await supabase.from("ryze_notifications").insert({
          title: `Crédito vencido: ${purchase.providerName}`,
          message: `La compra ${purchase.id} venció el ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(dueDate)}. Total ${formatter}.`,
          type: "warning",
          read: false,
          organization_id: orgId
        });
        await updateCooldown(overdueKey);
      }
    }
  };
  return {
    checkForNewInsights: async () => {
      await generateLowStockAlerts();
      await generateCreditAlerts();
    },
    getNotifications: async () => {
      const { data, error } = await supabase.from("ryze_notifications").select("*").order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map((n) => ({ ...n, date: new Date(n.date) }));
    },
    markAsRead: async (notificationId) => {
      await supabase.from("ryze_notifications").update({ read: true }).eq("id", notificationId);
    },
    markAllAsRead: async () => {
      await supabase.from("ryze_notifications").update({ read: true }).eq("read", false);
    }
  };
};

const AppAlertContext = reactExports.createContext(void 0);
const useAppAlerts = () => {
  const context = reactExports.useContext(AppAlertContext);
  if (!context) {
    throw new Error("useAppAlerts must be used within an AppAlertProvider");
  }
  return context;
};
const AppAlertProvider = ({ children }) => {
  const { session } = useAuth();
  const services = useServices();
  const [insightService, setInsightService] = reactExports.useState(null);
  const [alerts, setAlerts] = reactExports.useState([]);
  const [isLoading, setIsLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    if (session?.organization?.id && services) {
      const threshold = session.organization.lowStockThreshold ?? 10;
      const unitThresholds = session.organization.uiSettings?.unitLowStockThresholds ?? {};
      setInsightService(
        createInsightService(
          session.organization.id,
          services.inventoryService,
          services.purchaseService,
          threshold,
          unitThresholds,
          session.organization.currency || "MXN"
        )
      );
    }
  }, [session, services]);
  const fetchAlerts = reactExports.useCallback(async () => {
    if (!insightService) return;
    setIsLoading(true);
    try {
      await insightService.checkForNewInsights();
      const fetchedAlerts = await insightService.getNotifications();
      setAlerts(fetchedAlerts);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [insightService]);
  reactExports.useEffect(() => {
    if (insightService) {
      fetchAlerts();
    }
  }, [fetchAlerts, insightService]);
  const markAsRead = async (id) => {
    if (!insightService) return;
    await insightService.markAsRead(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  };
  const markAllAsRead = async () => {
    if (!insightService) return;
    await insightService.markAllAsRead();
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };
  const unreadCount = alerts.filter((a) => !a.read).length;
  const value = {
    alerts,
    unreadCount,
    isLoading,
    fetchAlerts,
    markAsRead,
    markAllAsRead
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppAlertContext.Provider, { value, children });
};

const getTypeStyles = (type) => {
  switch (type) {
    case "warning":
      return "border-l-amber-400";
    case "success":
      return "border-l-green-400";
    case "info":
    default:
      return "border-l-sky-400";
  }
};
const AlertsDropdown = ({ onClose }) => {
  const { alerts, markAsRead, markAllAsRead, unreadCount } = useAppAlerts();
  const handleMarkAsRead = (id, e) => {
    e.stopPropagation();
    markAsRead(id);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "absolute top-full right-0 mt-2 w-80 max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-left animate-fade-in", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-3 flex justify-between items-center border-b border-slate-700", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-slate-100", children: "Notificaciones" }),
      unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: markAllAsRead, className: "text-xs text-sky-400 hover:underline", children: "Marcar todas como leídas" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "max-h-96 overflow-y-auto", children: alerts.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-400 text-sm text-center p-4", children: "No hay notificaciones." }) : alerts.map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `p-3 border-b border-slate-700/50 border-l-4 ${getTypeStyles(alert.type)} ${alert.read ? "opacity-60" : ""}`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-start", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm text-slate-200", children: alert.title }),
        !alert.read && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: (e) => handleMarkAsRead(alert.id, e), title: "Marcar como leída", className: "ml-2 flex-shrink-0 w-2 h-2 mt-1.5 bg-sky-400 rounded-full" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-300 mt-1", children: alert.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-slate-500 mt-2 text-right", children: new Date(alert.date).toLocaleString() })
    ] }, alert.id)) })
  ] });
};

const StarIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" }) });

const BellIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" }) });

const Header = ({ onLogout, session, onToggleAIChat, onToggleMobileMenu }) => {
  const { user } = session;
  const { unreadCount } = useAppAlerts();
  const [isAlertsOpen, setIsAlertsOpen] = reactExports.useState(false);
  const { t } = useI18n();
  return /* @__PURE__ */ jsxRuntimeExports.jsx("header", { className: "bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700 no-print", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "container mx-auto px-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between h-16", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
      onToggleMobileMenu && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onToggleMobileMenu,
          className: "md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700",
          "aria-label": "Menú",
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className: "h-6 w-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" }) })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Logo, { className: "h-8 w-auto" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(LanguageSwitcher, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: onToggleAIChat,
          title: "Asistente IA",
          className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-600 hover:to-purple-700 transition-all shadow-md transform hover:scale-105",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(StarIcon, { className: "h-5 w-5" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-semibold hidden sm:inline", children: "Asistente IA" })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setIsAlertsOpen(!isAlertsOpen), className: "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(BellIcon, { className: "h-6 w-6" }),
          unreadCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white", children: unreadCount })
        ] }),
        isAlertsOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(AlertsDropdown, { onClose: () => setIsAlertsOpen(false) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: user.email }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: onLogout,
          className: "px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-xs",
          children: t("logout")
        }
      )
    ] })
  ] }) }) });
};

const NavDropdown = ({ label, children, active }) => {
  const [isOpen, setIsOpen] = reactExports.useState(active);
  reactExports.useEffect(() => {
    if (active) {
      setIsOpen(true);
    }
  }, [active]);
  const validChildren = React.Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        className: `w-full flex items-center p-2 rounded-lg transition-colors text-left ${active ? "text-white" : "text-slate-300"} hover:bg-slate-700`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", className: `h-5 w-5 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`, viewBox: "0 0 20 20", fill: "currentColor", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd" }) })
        ]
      }
    ),
    isOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "pt-2 pl-4 space-y-2", children })
  ] });
};

const POSIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 20 20", fill: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" }) });

const AddonIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: "1.5", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" }) });

const NavItem = ({ page, label, icon, activePage, onNavigate }) => {
  if (!label) return null;
  const isActive = activePage === page;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      onClick: () => onNavigate(page),
      className: `w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-700"}`,
      children: [
        icon,
        label
      ]
    }
  ) });
};
const ICONS = {
  dashboard: /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardIcon, { className: "h-5 w-5" }),
  pos: /* @__PURE__ */ jsxRuntimeExports.jsx(POSIcon, { className: "h-5 w-5" }),
  settings: /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsIcon, { className: "h-5 w-5" }),
  addons: /* @__PURE__ */ jsxRuntimeExports.jsx(AddonIcon, { className: "h-5 w-5" })
};
const Sidebar = ({ activePage, onNavigate, posEmployee }) => {
  const { session } = useAuth();
  const { t } = useI18n();
  const managementPages = ["inventory", "clients", "providers", "employees", "marketing", "quotes", "payroll", "time_clock_manager", "commissions"];
  const reportPages = ["reports", "reports_cashier", "reports_inventory_counts"];
  const employeePages = ["employees", "time_clock_manager", "commissions"];
  const isManagementActive = managementPages.includes(activePage);
  const isReportsActive = reportPages.includes(activePage);
  const isEmployeeActive = employeePages.includes(activePage);
  const isSolopreneur = session?.organization?.subscriptionTier === "solopreneur";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "w-64 h-full bg-slate-800 border-r border-slate-700 flex flex-col no-print", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-grow p-4 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "dashboard", label: t("navDashboard"), icon: ICONS.dashboard, activePage, onNavigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "pos", label: t("navPOS"), icon: ICONS.pos, activePage, onNavigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(NavDropdown, { label: t("navReports"), active: isReportsActive, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "reports", label: t("navReportsSales"), activePage, onNavigate }),
        !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "reports_cashier", label: t("navReportsCashier"), activePage, onNavigate }),
        !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "reports_inventory_counts", label: t("navReportsInventory"), activePage, onNavigate })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(NavDropdown, { label: t("navManagement"), active: isManagementActive, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "inventory", label: t("navManagementInventory"), activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "combos", label: "Combos", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "promotions", label: "Promociones", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "providers", label: "Proveedores", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "clients", label: t("navManagementClients"), activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "quotes", label: t("navManagementQuotes"), activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "marketing", label: t("navManagementMarketing"), activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "payroll", label: "Nómina", activePage, onNavigate })
      ] }),
      !isSolopreneur && /* @__PURE__ */ jsxRuntimeExports.jsxs(NavDropdown, { label: t("navManagementEmployees"), active: isEmployeeActive, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "employees", label: "Gestión de Empleados", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "time_clock_manager", label: "Checador de Horas", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "commissions", label: "Gestión de Comisiones", activePage, onNavigate })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(NavDropdown, { label: t("navFinances"), active: activePage === "financials" || activePage === "portfolio", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "financials", label: "Finanzas", activePage, onNavigate }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "portfolio", label: "Portafolio de Inversiones", activePage, onNavigate })
      ] })
    ] }) }),
    activePage === "pos" && posEmployee && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-t border-slate-700 flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-2 bg-slate-700/50 rounded-md text-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-slate-400 block", children: "Caja Activa" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-semibold text-slate-100", children: posEmployee.name })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-4 border-t border-slate-700 flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "space-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "addons", label: t("navSettingsAddons"), icon: ICONS.addons, activePage, onNavigate }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(NavItem, { page: "settings", label: t("navSettings"), icon: ICONS.settings, activePage, onNavigate })
    ] }) })
  ] });
};

const SuperAdminBanner = () => {
  const { isImpersonating, endImpersonation, session } = useAuth();
  if (!isImpersonating) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-amber-500 text-amber-900 font-bold text-center p-2 text-sm sticky top-0 z-50", children: [
    "Estás viendo como ",
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "underline", children: session?.organization?.name }),
    ".",
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: endImpersonation, className: "underline ml-4 font-bold hover:text-black", children: "Volver al Super Admin" })
  ] });
};

const getBannerStyles = (type) => {
  switch (type) {
    case "promo":
      return "bg-green-600 text-white";
    case "warning":
      return "bg-amber-500 text-amber-900";
    case "info":
    default:
      return "bg-sky-600 text-white";
  }
};
const PlatformAnnouncementBanner = ({ tier }) => {
  const [announcement, setAnnouncement] = reactExports.useState(null);
  const [isVisible, setIsVisible] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!tier) return;
      const announcements = await platformSettingsService.getActiveAnnouncementsForTier(tier);
      if (announcements.length > 0) {
        setAnnouncement(announcements[0]);
        setIsVisible(true);
      } else {
        setAnnouncement(null);
        setIsVisible(false);
      }
    };
    fetchAnnouncement();
  }, [tier]);
  if (!isVisible || !announcement) {
    return null;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `w-full p-2 text-center text-sm font-semibold ${getBannerStyles(announcement.type)}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: announcement.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setIsVisible(false), className: "ml-4 font-bold text-lg leading-none", children: "×" })
  ] });
};

const ClockIcon = (props) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", ...props, children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" }) });

const TimeClockModal = reactExports.lazy(() => __vitePreload(() => import('./TimeClockModal-CG4Tqpz-.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6,7]):void 0));
const FloatingTimeClock = () => {
  const [isModalOpen, setIsModalOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        onClick: () => setIsModalOpen(true),
        className: "fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 no-print",
        "aria-label": "Abrir checador de tiempo",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(ClockIcon, { className: "h-8 w-8" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: isModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      TimeClockModal,
      {
        isOpen: isModalOpen,
        onClose: () => setIsModalOpen(false)
      }
    ) })
  ] });
};

const getPurchaseAmountBreakdown = (purchase) => {
  const subtotal = purchase.subtotal ?? purchase.total;
  const taxTotal = purchase.taxTotal ?? Math.max(0, purchase.total - subtotal);
  return {
    subtotal,
    taxTotal,
    total: subtotal + taxTotal
  };
};
const aggregatePurchaseBreakdown = (purchases) => {
  return purchases.reduce(
    (acc, purchase) => {
      const { subtotal, taxTotal, total } = getPurchaseAmountBreakdown(purchase);
      acc.subtotal += subtotal;
      acc.taxTotal += taxTotal;
      acc.total += total;
      return acc;
    },
    { subtotal: 0, taxTotal: 0, total: 0 }
  );
};

const DashboardPage = reactExports.lazy(() => __vitePreload(() => import('./DashboardPage-h-fboQBj.js'),true              ?__vite__mapDeps([8,1,2,3,4,5,9,6,7]):void 0));
const POSPage = reactExports.lazy(() => __vitePreload(() => import('./POSPage-CfsNRIk2.js'),true              ?__vite__mapDeps([10,1,2,3,4,5,11,12,6,7]):void 0));
const ReportsPage = reactExports.lazy(() => __vitePreload(() => import('./ReportsPage-DYsZ0J96.js'),true              ?__vite__mapDeps([13,2,14,1,3,4,5,6,7,15,16]):void 0));
const InventoryPage = reactExports.lazy(() => __vitePreload(() => import('./InventoryPage-Cd659UK0.js'),true              ?__vite__mapDeps([17,1,2,3,4,5,18,11,19,16,20,9,6,7]):void 0));
const CombosPage = reactExports.lazy(() => __vitePreload(() => import('./CombosPage-CuObhsAv.js'),true              ?__vite__mapDeps([21,2,1,3,4,5,9,22,12,6,7]):void 0));
const PromotionsPage = reactExports.lazy(() => __vitePreload(() => import('./PromotionsPage-gLX2fNCD.js'),true              ?__vite__mapDeps([23,2,1,3,4,5,9,22,12,6,7]):void 0));
const ClientsPage = reactExports.lazy(() => __vitePreload(() => import('./ClientsPage-Cflj8FVR.js'),true              ?__vite__mapDeps([24,1,2,3,4,5,16,6,7]):void 0));
const ProvidersPage = reactExports.lazy(() => __vitePreload(() => import('./ProvidersPage-DN08rZkv.js'),true              ?__vite__mapDeps([25,2,1,3,4,5,12,22,6,7]):void 0));
const EmployeesPage = reactExports.lazy(() => __vitePreload(() => import('./EmployeesPage-DhlyNDbk.js'),true              ?__vite__mapDeps([26,1,2,3,4,5,16,6,7]):void 0));
const MarketingPage = reactExports.lazy(() => __vitePreload(() => import('./MarketingPage-BTJtzyhM.js'),true              ?__vite__mapDeps([27,2,1,3,4,5,28,6,7,29,16]):void 0));
const QuotesPage = reactExports.lazy(() => __vitePreload(() => import('./QuotesPage-DOhy8eTr.js'),true              ?__vite__mapDeps([30,2,1,3,4,5,9,31,32,6,7,16,18]):void 0));
const FinancialsPage = reactExports.lazy(() => __vitePreload(() => import('./FinancialsPage-vbzPr3bf.js'),true              ?__vite__mapDeps([33,1,2,3,4,5,12,9,19,22,18,16,6,7]):void 0));
const PortfolioPage = reactExports.lazy(() => __vitePreload(() => import('./PortfolioPage-j0dSZWPo.js'),true              ?__vite__mapDeps([34,1,2,3,4,5,12,6,7]):void 0));
const AddonsPage = reactExports.lazy(() => __vitePreload(() => import('./AddonsPage-CNnHUZgK.js'),true              ?__vite__mapDeps([35,2,1,3,4,5,6,7]):void 0));
const SettingsPage = reactExports.lazy(() => __vitePreload(() => import('./SettingsPage-CmlwmlGV.js'),true              ?__vite__mapDeps([36,1,2,3,4,5,12,37,20,16,6,7]):void 0));
const CashRegisterReportsPage = reactExports.lazy(() => __vitePreload(() => import('./CashRegisterReportsPage-BVJ5jH6J.js'),true              ?__vite__mapDeps([38,2,1,3,4,5,6,7]):void 0));
const InventoryCountReportsPageContainer = reactExports.lazy(() => __vitePreload(() => import('./InventoryCountReportsPageContainer-C71br3lM.js'),true              ?__vite__mapDeps([39,1,2,3,4,5,6,7]):void 0));
const PayrollPage = reactExports.lazy(() => __vitePreload(() => import('./PayrollPage-rgczXCV5.js'),true              ?__vite__mapDeps([40,2,1,3,4,5,9,16,6,7]):void 0));
const TimeClockManagerPage = reactExports.lazy(() => __vitePreload(() => import('./TimeClockManagerPage-BqTysk50.js'),true              ?__vite__mapDeps([41,2,1,3,4,5,15,16,6,7]):void 0));
const CommissionManagementPage = reactExports.lazy(() => __vitePreload(() => import('./CommissionManagementPage-BdI6PW77.js'),true              ?__vite__mapDeps([42,1,2,3,4,5,9,16,6,7]):void 0));
const AIChatWidget = reactExports.lazy(() => __vitePreload(() => import('./AIChatWidget-CKRTjRkb.js'),true              ?__vite__mapDeps([43,2]):void 0));
class ErrorBoundary extends reactExports.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error loading module:", error, errorInfo);
    if (error.message.includes("Failed to fetch dynamically imported module")) {
      console.warn("Module load error detected. This might be a cache issue. Try refreshing the page.");
    }
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-900/20 border border-red-700 rounded-lg p-6 max-w-md mx-auto", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-red-400 mb-2", children: "Error al cargar la página" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-slate-300 mb-4", children: this.state.error?.message.includes("Failed to fetch") ? "El módulo no se pudo cargar. Esto puede ser un problema de caché." : "Ocurrió un error inesperado." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => window.location.reload(),
            className: "px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500",
            children: "Recargar página"
          }
        )
      ] }) });
    }
    return this.props.children;
  }
}
const MainLayoutContent = () => {
  const { session, signOut } = useAuth();
  const { addNotification } = useNotification();
  const { cashRegisterService, employeeService, saleService, expenseService, purchaseService, clientService, inventoryService, aiDataCacheService } = useServices();
  const [activePage, setActivePage] = usePersistentState("last-active-page", "dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = reactExports.useState(false);
  const [storedPOSSession, setStoredPOSSession] = usePersistentState("active-pos-session", null);
  const activePOSSession = reactExports.useMemo(() => {
    if (!storedPOSSession) return null;
    return {
      ...storedPOSSession,
      startTime: new Date(storedPOSSession.startTime),
      endTime: storedPOSSession.endTime ? new Date(storedPOSSession.endTime) : void 0
    };
  }, [storedPOSSession]);
  const setActivePOSSession = reactExports.useCallback((session2) => {
    if (!session2) {
      setStoredPOSSession(null);
    } else {
      setStoredPOSSession({
        ...session2,
        startTime: session2.startTime.toISOString(),
        endTime: session2.endTime ? session2.endTime.toISOString() : null
      });
    }
  }, [setStoredPOSSession]);
  const [posEmployee, setStoredPOSEmployee] = usePersistentState("active-pos-employee", null);
  const setPOSEmployee = reactExports.useCallback((employee) => {
    setStoredPOSEmployee(employee || null);
  }, [setStoredPOSEmployee]);
  const [isSessionLoading, setIsSessionLoading] = reactExports.useState(true);
  const [isAIChatOpen, setIsAIChatOpen] = reactExports.useState(false);
  const [aiChatHistory, setAIChatHistory] = usePersistentState("ai-chat-history", []);
  const [isAIChatLoading, setIsAIChatLoading] = reactExports.useState(false);
  const handleSendChatMessage = async (message) => {
    const newHistory = [...aiChatHistory, { role: "user", content: message }];
    setAIChatHistory(newHistory);
    setIsAIChatLoading(true);
    try {
      const cache = await aiDataCacheService.getCache();
      const [expensesData, purchasesData] = await Promise.all([
        expenseService.getAllExpenses(),
        purchaseService.getPurchaseNotes()
      ]);
      const totalExpenses = expensesData.reduce((acc, e) => acc + e.amount, 0);
      const paidPurchaseTotals = aggregatePurchaseBreakdown(purchasesData.filter((p) => p.status === "Pagada"));
      const totalPurchases = paidPurchaseTotals.total;
      const summary = cache ? {
        totalRevenue: cache.totalRevenue,
        netProfit: cache.netProfit,
        totalSales: cache.totalSalesCount,
        bestSellers: cache.bestSellers.map((p) => p.name),
        purchaseTaxes: paidPurchaseTotals.taxTotal,
        inventoryStats: {
          totalProducts: cache.totalProducts,
          totalUnits: cache.totalInventoryUnits,
          valueAtCost: cache.inventoryValueAtCost,
          valueAtPrice: cache.inventoryValueAtPrice,
          lowStockCount: cache.lowStockCount
        }
      } : {
        // Fallback si no hay cache (primera vez)
        totalRevenue: 0,
        netProfit: 0,
        totalSales: 0,
        bestSellers: [],
        purchaseTaxes: 0,
        inventoryStats: {
          totalProducts: 0,
          totalUnits: 0,
          valueAtCost: 0,
          valueAtPrice: 0,
          lowStockCount: 0
        }
      };
      const response = await generalChat(message, session.organization, summary);
      setAIChatHistory((prev) => [...prev, { role: "model", content: response }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      setAIChatHistory((prev) => [...prev, { role: "model", content: `Error al contactar la IA: ${errorMessage}` }]);
      addNotification("Error al comunicarse con la IA.", "error");
    } finally {
      setIsAIChatLoading(false);
    }
  };
  reactExports.useEffect(() => {
    const fetchInitialSession = async () => {
      if (activePOSSession && posEmployee) {
        setIsSessionLoading(false);
        return;
      }
      if (activePOSSession && !posEmployee) {
        const employee = await employeeService.findEmployeeById(activePOSSession.employeeId);
        if (employee) {
          setPOSEmployee(employee);
          setIsSessionLoading(false);
          return;
        }
      }
      if (session?.organization?.id) {
        const openSessions = await cashRegisterService.getActiveSessions();
        if (openSessions.length > 0) {
          const sessionToResume = openSessions[0];
          const employee = await employeeService.findEmployeeById(sessionToResume.employeeId);
          if (employee) {
            setActivePOSSession(sessionToResume);
            setPOSEmployee(employee);
          }
        }
      }
      setIsSessionLoading(false);
    };
    fetchInitialSession();
  }, [session?.organization?.id, cashRegisterService, employeeService, activePOSSession, posEmployee, setPOSEmployee]);
  const handleSignOut = async () => {
    setActivePOSSession(null);
    setPOSEmployee(null);
    await signOut();
  };
  const handleNavigationAttempt = (page) => {
    setActivePage(page);
  };
  const renderContent = () => {
    const userRole = session.user.role;
    const subscriptionTier = session.organization.subscriptionTier;
    const pageProps = { userRole, subscriptionTier, onNavigate: handleNavigationAttempt };
    switch (activePage) {
      case "dashboard":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardPage, {});
      case "pos":
        if (isSessionLoading) {
          return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "Verificando sesión de caja..." });
        }
        return /* @__PURE__ */ jsxRuntimeExports.jsx(
          POSPage,
          {
            activeSession: activePOSSession,
            employeeForSession: posEmployee,
            onSessionStart: (session2, employee) => {
              setActivePOSSession(session2);
              setPOSEmployee(employee);
            },
            onSessionEnd: () => {
              setActivePOSSession(null);
              setPOSEmployee(null);
            },
            onNavigate: handleNavigationAttempt
          }
        );
      case "reports":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ReportsPage, { onNavigate: handleNavigationAttempt });
      case "reports_cashier":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CashRegisterReportsPage, {});
      case "reports_inventory_counts":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(InventoryCountReportsPageContainer, {});
      case "inventory":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(InventoryPage, { ...pageProps });
      case "combos":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CombosPage, {});
      case "promotions":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(PromotionsPage, {});
      case "clients":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ClientsPage, { ...pageProps });
      case "providers":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(ProvidersPage, {});
      case "employees":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(EmployeesPage, { ...pageProps });
      case "payroll":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(PayrollPage, { onNavigate: handleNavigationAttempt });
      case "time_clock_manager":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(TimeClockManagerPage, { onNavigate: handleNavigationAttempt });
      case "commissions":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(CommissionManagementPage, { onNavigate: handleNavigationAttempt });
      case "marketing":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(MarketingPage, { onNavigate: handleNavigationAttempt });
      case "quotes":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(QuotesPage, { ...pageProps });
      case "financials":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(FinancialsPage, { ...pageProps });
      case "portfolio":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(PortfolioPage, {});
      case "addons":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(AddonsPage, {});
      case "settings":
        return /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsPage, { onNavigate: handleNavigationAttempt });
      default:
        return /* @__PURE__ */ jsxRuntimeExports.jsx(DashboardPage, {});
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(AppAlertProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "h-screen flex overflow-hidden bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100", children: [
    isMobileMenuOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 bg-black/50 z-40 md:hidden",
        onClick: () => setIsMobileMenuOpen(false)
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `fixed md:static inset-y-0 left-0 z-50 md:z-auto transform transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sidebar, { activePage, onNavigate: (page) => {
      handleNavigationAttempt(page);
      setIsMobileMenuOpen(false);
    }, posEmployee }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(SuperAdminBanner, {}),
      /* @__PURE__ */ jsxRuntimeExports.jsx(PlatformAnnouncementBanner, { tier: session.organization.subscriptionTier }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Header,
        {
          onLogout: handleSignOut,
          session,
          onToggleAIChat: () => setIsAIChatOpen((prev) => !prev),
          onToggleMobileMenu: () => setIsMobileMenuOpen((prev) => !prev)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("main", { className: `flex-1 ${activePage === "pos" ? "overflow-hidden" : "overflow-y-auto"}`, children: /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6 text-center text-slate-400", children: "Cargando página..." }), children: /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: renderContent() }) }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(FloatingTimeClock, {}),
    /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Suspense, { fallback: null, children: isAIChatOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
      AIChatWidget,
      {
        history: aiChatHistory,
        onSendMessage: handleSendChatMessage,
        onClose: () => setIsAIChatOpen(false),
        isLoading: isAIChatLoading
      }
    ) })
  ] }) });
};
const MainLayout = () => {
  const { session } = useAuth();
  if (!session || !session.organization) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Error: No session or organization found." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ServiceProvider, { orgId: session.organization.id, children: /* @__PURE__ */ jsxRuntimeExports.jsx(MainLayoutContent, {}) });
};

const MainLayout$1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: MainLayout
}, Symbol.toStringTag, { value: 'Module' }));

export { AddonIcon as A, DEFAULT_TICKET_LAYOUT as D, MainLayout$1 as M, POSIcon as P, StarIcon as S, aggregatePurchaseBreakdown as a, usePersistentState as b, getCrossSellSuggestion as c, detectUnitOfMeasure as d, generateQuoteTerms as e, getPurchaseAmountBreakdown as f, getBusinessSnapshotSummary as g, buildTicketHtml as h, isProductLowStock as i, normalizeUnitKey as j, generateCampaignContent as k, analyzeBusinessGoals as l, getProjectRecommendations as m, normalizeThresholdMap as n, getInventoryOptimizationSuggestion as o, geminiPortfolioService as p, segmentClients as s, useServices as u };
