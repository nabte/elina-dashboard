import { s as supabase } from './index-B4F2XZYo.js';

const mapCountFromDb = (data) => ({
  id: data.id,
  organizationId: data.organization_id,
  name: data.name,
  status: data.status,
  createdBy: data.created_by,
  createdAt: new Date(data.created_at),
  approvedBy: data.approved_by,
  approvedAt: data.approved_at ? new Date(data.approved_at) : void 0,
  notes: data.notes,
  expiresAt: data.expires_at ? new Date(data.expires_at) : void 0,
  categoryGroups: [],
  // Se carga por separado
  statistics: data.statistics
});
const mapGroupFromDb = (data) => ({
  id: data.id,
  countId: data.count_id,
  groupName: data.group_name,
  categoryIds: data.category_ids || [],
  accessToken: data.access_token,
  createdAt: new Date(data.created_at)
});
const mapItemFromDb = (data) => ({
  id: data.id,
  countId: data.count_id,
  productId: data.product_id,
  productName: data.product_name || "",
  productSku: data.product_sku || data.product_id,
  categoryName: data.category_name,
  organizationId: data.organization_id,
  systemStock: parseFloat(data.system_stock) || 0,
  countedStock: data.counted_stock ? parseFloat(data.counted_stock) : void 0,
  countedByToken: data.counted_by_token,
  countedAt: data.counted_at ? new Date(data.counted_at) : void 0,
  difference: data.difference ? parseFloat(data.difference) : void 0,
  status: data.status,
  notes: data.notes,
  unitOfMeasure: data.unit_of_measure || "pieza"
});
const createInventoryCountService = (orgId) => {
  return {
    /**
     * Crear un nuevo conteo
     */
    createCount: async (name, categoryGroups, expiresInDays) => {
      const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1e3).toISOString() : null;
      const { data: countData, error: countError } = await supabase.from("inventory_counts").insert({
        organization_id: orgId,
        name,
        status: "draft",
        created_by: (await supabase.auth.getUser()).data.user?.id,
        expires_at: expiresAt
      }).select().single();
      if (countError) throw countError;
      const groups = [];
      for (const group of categoryGroups) {
        const { data: tokenData } = await supabase.rpc("generate_count_token");
        const token = tokenData || crypto.randomUUID().replace(/-/g, "").substring(0, 32);
        const { data: groupData, error: groupError } = await supabase.from("inventory_count_category_groups").insert({
          count_id: countData.id,
          group_name: group.groupName,
          category_ids: group.categoryIds,
          access_token: token
        }).select().single();
        if (groupError) throw groupError;
        const mappedGroup = mapGroupFromDb(groupData);
        mappedGroup.url = `${window.location.origin}/count/${token}`;
        groups.push(mappedGroup);
      }
      const allCategoryIds = categoryGroups.flatMap((g) => g.categoryIds);
      const hasGroupsWithCategories = categoryGroups.some((g) => g.categoryIds.length > 0);
      const hasGroupsWithoutCategories = categoryGroups.some((g) => g.categoryIds.length === 0);
      let productsQuery = supabase.from("ryze_products").select("id, name, stock, unit_of_measure, category_id").eq("organization_id", orgId);
      if (hasGroupsWithCategories && hasGroupsWithoutCategories) {
        productsQuery = productsQuery.or(`category_id.in.(${allCategoryIds.join(",")}),category_id.is.null`);
      } else if (hasGroupsWithCategories) {
        productsQuery = productsQuery.in("category_id", allCategoryIds);
      } else {
        productsQuery = productsQuery.is("category_id", null);
      }
      const { data: products, error: productsError } = await productsQuery;
      if (productsError) throw productsError;
      const items = products.map((p) => ({
        count_id: countData.id,
        product_id: p.id,
        organization_id: orgId,
        system_stock: p.stock || 0,
        status: "pending",
        unit_of_measure: p.unit_of_measure || "pieza"
      }));
      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("inventory_count_items").insert(items);
        if (itemsError) throw itemsError;
      }
      const count = mapCountFromDb(countData);
      count.categoryGroups = groups;
      return count;
    },
    /**
     * Obtener todos los conteos
     */
    getCounts: async () => {
      const { data, error } = await supabase.from("inventory_counts").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      if (error) throw error;
      const counts = data.map(mapCountFromDb);
      for (const count of counts) {
        const { data: groupsData } = await supabase.from("inventory_count_category_groups").select("*").eq("count_id", count.id);
        count.categoryGroups = (groupsData || []).map(mapGroupFromDb).map((g) => ({
          ...g,
          url: `${window.location.origin}/count/${g.accessToken}`
        }));
      }
      return counts;
    },
    /**
     * Obtener un conteo por ID
     */
    getCountById: async (countId) => {
      const { data: countData, error: countError } = await supabase.from("inventory_counts").select("*").eq("id", countId).eq("organization_id", orgId).single();
      if (countError) throw countError;
      const { data: statsData } = await supabase.rpc("get_count_statistics", {
        p_count_id: countId
      });
      const { data: itemsData, error: itemsError } = await supabase.from("inventory_count_items").select(`
                    *,
                    product:ryze_products!inner(id, name, category_id)
                `).eq("count_id", countId);
      if (itemsError) throw itemsError;
      const categoryIds = [...new Set(itemsData.map((i) => i.product?.category_id).filter(Boolean))];
      const { data: categoriesData } = await supabase.from("ryze_categories").select("id, name").in("id", categoryIds);
      const categoryMap = new Map((categoriesData || []).map((c) => [c.id, c.name]));
      const items = itemsData.map((item) => {
        const mapped = mapItemFromDb(item);
        mapped.productName = item.product?.name || mapped.productName;
        mapped.categoryName = item.product?.category_id ? categoryMap.get(item.product.category_id) : void 0;
        return mapped;
      });
      const count = mapCountFromDb(countData);
      count.statistics = statsData?.[0];
      return {
        count,
        items,
        statistics: statsData?.[0] || {
          totalProducts: 0,
          countedProducts: 0,
          pendingProducts: 0,
          exactMatches: 0,
          lessThanSystem: 0,
          moreThanSystem: 0
        }
      };
    },
    /**
     * Obtener productos para un grupo (por token)
     */
    getProductsByToken: async (token) => {
      const { data: groupData, error: groupError } = await supabase.from("inventory_count_category_groups").select("count_id, category_ids").eq("access_token", token).single();
      if (groupError) throw groupError;
      const { data: countData } = await supabase.from("inventory_counts").select("organization_id").eq("id", groupData.count_id).single();
      if (!countData) throw new Error("Conteo no encontrado");
      const { data: itemsData, error: itemsError } = await supabase.from("inventory_count_items").select(`
                    *,
                    product:ryze_products!inner(id, name, category_id, unit_of_measure)
                `).eq("count_id", groupData.count_id).eq("organization_id", countData.organization_id);
      if (itemsError) throw itemsError;
      const categoryIds = groupData.category_ids || [];
      const filteredItems = itemsData.filter((item) => {
        const productCategoryId = item.product?.category_id;
        if (categoryIds.length === 0) {
          return !productCategoryId;
        }
        return categoryIds.includes(productCategoryId);
      });
      return filteredItems.map((item) => {
        const mapped = mapItemFromDb(item);
        mapped.productName = item.product?.name || mapped.productName;
        mapped.unitOfMeasure = item.product?.unit_of_measure || mapped.unitOfMeasure;
        return mapped;
      });
    },
    /**
     * Guardar conteo de un producto (por token)
     */
    saveCount: async (token, productId, countedStock) => {
      const { data: groupData } = await supabase.from("inventory_count_category_groups").select("count_id").eq("access_token", token).single();
      if (!groupData) throw new Error("Token inválido");
      const { error } = await supabase.from("inventory_count_items").update({
        counted_stock: countedStock,
        counted_by_token: token,
        counted_at: (/* @__PURE__ */ new Date()).toISOString(),
        status: "counted"
      }).eq("count_id", groupData.count_id).eq("product_id", productId);
      if (error) throw error;
    },
    /**
     * Aprobar un conteo
     */
    approveCount: async (countId, updateInventory = true) => {
      const { error } = await supabase.rpc("approve_inventory_count", {
        p_count_id: countId,
        p_approved_by: (await supabase.auth.getUser()).data.user?.id,
        p_update_inventory: updateInventory
      });
      if (error) throw error;
    },
    /**
     * Cambiar estado de un conteo
     */
    updateCountStatus: async (countId, status) => {
      const { error } = await supabase.from("inventory_counts").update({ status }).eq("id", countId).eq("organization_id", orgId);
      if (error) throw error;
    }
  };
};

export { createInventoryCountService as c };
