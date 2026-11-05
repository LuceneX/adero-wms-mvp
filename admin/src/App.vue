<template>
  <q-layout view="hHh Lpr fFf" class="admin-shell">
    <q-header bordered class="bg-white text-grey-9">
      <q-toolbar class="admin-toolbar">
        <q-toolbar-title class="text-weight-medium">LuceneX Admin Console</q-toolbar-title>
        <q-btn flat dense icon="logout" aria-label="Log out" @click="logout" />
        <q-btn flat dense icon="open_in_new" label="Open operations" href="/" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered :width="248" class="bg-grey-10 text-grey-3">
      <div class="drawer-brand"><div class="text-h6">LuceneX.</div><div class="text-caption text-grey-5">Platform administration</div></div>
      <q-list padding>
        <q-item clickable :active="activeTab === 'overview'" active-class="nav-active" @click="activeTab='overview'">
          <q-item-section avatar><q-icon name="dashboard" /></q-item-section><q-item-section>Overview</q-item-section>
        </q-item>
        <q-item clickable :active="activeTab === 'companies'" active-class="nav-active" @click="activeTab='companies'">
          <q-item-section avatar><q-icon name="business" /></q-item-section><q-item-section>Company & warehouses</q-item-section>
        </q-item>
        <q-item clickable :active="activeTab === 'users'" active-class="nav-active" @click="activeTab='users'">
          <q-item-section avatar><q-icon name="group" /></q-item-section><q-item-section>Users & roles</q-item-section>
        </q-item>
      </q-list>
      <div class="drawer-foot">Access is enforced by the Worker API and warehouse membership.<q-btn flat dense icon="logout" label="Log out" class="full-width q-mt-md" @click="logout" /></div>
    </q-drawer>

    <q-page-container>
      <q-page padding class="admin-page">
        <q-banner v-if="error" dense rounded class="bg-red-1 text-red-10 q-mb-md"><template #avatar><q-icon name="error" /></template>{{ error }}</q-banner>
        <q-spinner v-if="loading" color="orange-9" size="32px" class="q-mt-xl" />
        <template v-else-if="data">
          <div class="page-heading"><div><div class="text-overline text-grey-7">ADMINISTRATION</div><h1>{{ heading }}</h1><p>{{ subtitle }}</p></div><q-btn color="orange-9" unelevated icon="refresh" label="Refresh" @click="load" /></div>

          <section v-if="activeTab === 'overview'">
            <div class="metric-grid">
              <q-card flat bordered><q-card-section><div class="metric-label">Company</div><div class="metric-value">{{ data.company.name }}</div><div class="metric-note">Tenant boundary</div></q-card-section></q-card>
              <q-card flat bordered><q-card-section><div class="metric-label">Warehouses</div><div class="metric-value">{{ data.warehouses.length }}</div><div class="metric-note">{{ activeWarehouse?.name || 'No active warehouse' }}</div></q-card-section></q-card>
              <q-card flat bordered><q-card-section><div class="metric-label">Memberships</div><div class="metric-value">{{ uniqueUsers }}</div><div class="metric-note">Users across this company</div></q-card-section></q-card>
              <q-card flat bordered><q-card-section><div class="metric-label">Active warehouse</div><div class="metric-value text-body1">{{ activeWarehouse?.code || '—' }}</div><div class="metric-note">Switch from the warehouse list</div></q-card-section></q-card>
            </div>
            <q-card flat bordered class="q-mt-md"><q-card-section><div class="section-title">Administrative boundary</div><p class="text-grey-7 q-mb-none">This console manages the current company and its warehouse memberships. Operational users see only data associated with their active membership.</p></q-card-section></q-card>
          </section>

          <section v-else-if="activeTab === 'companies'">
            <div class="section-actions"><q-btn color="orange-9" unelevated icon="add" label="Add warehouse" @click="warehouseDialog=true" /><q-btn outline color="grey-8" icon="domain_add" label="Create company" @click="companyDialog=true" /></div>
            <q-card flat bordered><q-table flat :rows="data.warehouses" :columns="warehouseColumns" row-key="id" :pagination="{rowsPerPage:10}"><template #body-cell-actions="props"><q-td :props="props"><q-btn flat dense icon="swap_horiz" label="Switch" @click="switchWarehouse(props.row.id)" /></q-td></template></q-table></q-card>
          </section>

          <section v-else>
            <div class="section-actions"><q-btn color="orange-9" unelevated icon="person_add" label="Assign user" @click="membershipDialog=true" /></div>
            <q-card flat bordered><q-table flat :rows="data.users" :columns="userColumns" row-key="id" :pagination="{rowsPerPage:10}"><template #body-cell-status="props"><q-td :props="props"><q-badge :color="props.row.status === 'active' ? 'positive' : 'grey-7'">{{ props.row.status }}</q-badge></q-td></template><template #body-cell-actions="props"><q-td :props="props"><q-btn flat dense icon="edit" label="Edit" @click="editMembership(props.row)" /></q-td></template></q-table></q-card>
          </section>
        </template>
        <q-card v-else flat bordered class="q-pa-lg"><div class="text-h6">Administrator access required</div><div class="text-grey-7 q-mt-sm">Sign in as an administrator in the main WMS, then return to the admin console.</div><q-btn class="q-mt-md" color="orange-9" unelevated label="Open sign-in" href="/" /></q-card>
      </q-page>
    </q-page-container>

    <q-dialog v-model="companyDialog"><q-card style="min-width:360px"><q-card-section class="text-h6">Create company</q-card-section><q-card-section><q-input v-model="companyName" label="Company name" outlined autofocus /></q-card-section><q-card-actions align="right"><q-btn flat label="Cancel" v-close-popup /><q-btn color="orange-9" label="Create" @click="createCompany" /></q-card-actions></q-card></q-dialog>
    <q-dialog v-model="warehouseDialog"><q-card style="min-width:360px"><q-card-section class="text-h6">Add warehouse</q-card-section><q-card-section><q-input v-model="warehouseCode" label="Code" outlined class="q-mb-sm" /><q-input v-model="warehouseName" label="Name" outlined /></q-card-section><q-card-actions align="right"><q-btn flat label="Cancel" v-close-popup /><q-btn color="orange-9" label="Add" @click="createWarehouse" /></q-card-actions></q-card></q-dialog>
    <q-dialog v-model="membershipDialog"><q-card style="min-width:380px"><q-card-section class="text-h6">Assign user</q-card-section><q-card-section><q-input v-model="memberEmail" label="Registered user email" outlined class="q-mb-sm" /><q-select v-model="memberWarehouse" :options="warehouseOptions" label="Warehouse" outlined emit-value map-options class="q-mb-sm" /><q-select v-model="memberRole" :options="roles" label="Role" outlined emit-value map-options /></q-card-section><q-card-actions align="right"><q-btn flat label="Cancel" v-close-popup /><q-btn color="orange-9" label="Save" @click="saveMembership" /></q-card-actions></q-card></q-dialog>
    <q-dialog v-model="editDialog"><q-card style="min-width:380px"><q-card-section class="text-h6">Edit membership</q-card-section><q-card-section><div class="text-caption text-grey-7 q-mb-md">{{ editing?.email }}</div><q-select v-model="editRole" :options="roles" label="Role" outlined emit-value map-options class="q-mb-sm" /><q-select v-model="editStatus" :options="statuses" label="Access status" outlined emit-value map-options /></q-card-section><q-card-actions align="right"><q-btn flat label="Cancel" v-close-popup /><q-btn color="orange-9" label="Save" @click="updateMembership" /></q-card-actions></q-card></q-dialog>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';

const drawer = ref(true); const activeTab = ref('overview'); const data = ref(null); const loading = ref(true); const error = ref('');
const companyDialog=ref(false); const warehouseDialog=ref(false); const membershipDialog=ref(false); const editDialog=ref(false);
const companyName=ref(''); const warehouseCode=ref(''); const warehouseName=ref(''); const memberEmail=ref(''); const memberWarehouse=ref(''); const memberRole=ref('operator'); const editing=ref(null); const editRole=ref('operator'); const editStatus=ref('active');
const roles=[{label:'Administrator',value:'admin'},{label:'Manager',value:'manager'},{label:'Supervisor',value:'supervisor'},{label:'Forklift operator',value:'forklift'},{label:'Operator',value:'operator'}]; const statuses=[{label:'Active',value:'active'},{label:'Suspended',value:'disabled'}];
const warehouseColumns=[{name:'code',label:'Code',field:'code',align:'left',sortable:true},{name:'name',label:'Warehouse',field:'name',align:'left',sortable:true},{name:'created_at',label:'Created',field:'created_at',align:'left'},{name:'actions',label:'',field:'actions',align:'right'}];
const userColumns=[{name:'name',label:'Name',field:'name',align:'left',sortable:true},{name:'email',label:'Email',field:'email',align:'left'},{name:'warehouse_id',label:'Warehouse',field:'warehouse_id',align:'left'},{name:'membership_role',label:'Role',field:'membership_role',align:'left'},{name:'status',label:'Status',field:'status',align:'left'},{name:'actions',label:'',field:'actions',align:'right'}];
const heading=computed(()=>activeTab.value==='overview'?'Administration overview':activeTab.value==='companies'?'Company & warehouses':'Users & roles'); const subtitle=computed(()=>activeTab.value==='overview'?'Manage the tenant boundary and active warehouse.':activeTab.value==='companies'?'Create warehouses and switch the active operating site.':'Assign roles and suspend access without deleting audit history.'); const activeWarehouse=computed(()=>data.value?.warehouses.find(w=>w.id===data.value.activeWarehouseId)); const uniqueUsers=computed(()=>new Set((data.value?.users||[]).map(u=>u.id)).size); const warehouseOptions=computed(()=>data.value?.warehouses.map(w=>({label:`${w.code} · ${w.name}`,value:w.id}))||[]);
const api=async(path,options={})=>{const response=await fetch(path,{headers:{'content-type':'application/json',...(options.headers||{})},...options});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error?.message||body.error||'Request failed');return body;};
const load=async()=>{loading.value=true;error.value='';try{data.value=await api('/api/admin/overview');memberWarehouse.value=data.value.activeWarehouseId||data.value.warehouses[0]?.id||'';}catch(e){data.value=null;error.value=e.message;}finally{loading.value=false;}};
const createCompany=async()=>{try{await api('/api/admin/companies',{method:'POST',body:JSON.stringify({name:companyName.value})});companyDialog.value=false;companyName.value='';Notify.create({type:'positive',message:'Company created'});await load();}catch(e){Notify.create({type:'negative',message:e.message});}};
const createWarehouse=async()=>{try{await api('/api/admin/warehouses',{method:'POST',body:JSON.stringify({code:warehouseCode.value,name:warehouseName.value})});warehouseDialog.value=false;warehouseCode.value='';warehouseName.value='';Notify.create({type:'positive',message:'Warehouse added'});await load();}catch(e){Notify.create({type:'negative',message:e.message});}};
const saveMembership=async()=>{try{await api('/api/admin/memberships',{method:'POST',body:JSON.stringify({email:memberEmail.value,warehouse_id:memberWarehouse.value,role:memberRole.value})});membershipDialog.value=false;memberEmail.value='';Notify.create({type:'positive',message:'Membership saved'});await load();}catch(e){Notify.create({type:'negative',message:e.message});}};
const editMembership=row=>{editing.value=row;editRole.value=row.membership_role;editStatus.value=row.status;editDialog.value=true;};
const updateMembership=async()=>{try{await api(`/api/admin/memberships/${editing.value.id}/${editing.value.warehouse_id}`,{method:'PATCH',body:JSON.stringify({role:editRole.value,status:editStatus.value})});editDialog.value=false;Notify.create({type:'positive',message:'Membership updated'});await load();}catch(e){Notify.create({type:'negative',message:e.message});}};
const switchWarehouse=async id=>{try{await api('/api/admin/switch-warehouse',{method:'POST',body:JSON.stringify({warehouse_id:id})});Notify.create({type:'positive',message:'Warehouse switched'});await load();}catch(e){Notify.create({type:'negative',message:e.message});}};
const logout=async()=>{try{await fetch('/api/auth/logout',{method:'POST'});}finally{window.location.assign('/');}};
onMounted(load);
</script>

<style>
body{margin:0;background:#f5f5f5;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.admin-shell{background:#f5f5f5}.admin-toolbar{min-height:58px;padding:0 24px}.drawer-brand{padding:20px 18px;border-bottom:1px solid rgba(255,255,255,.12)}.nav-active{background:#45505c!important;color:#fff!important;border-left:3px solid #eb5202}.drawer-foot{position:absolute;bottom:20px;padding:0 18px;color:#8f9aa4;font-size:11px;line-height:1.5}.admin-page{max-width:1420px;margin:0 auto}.page-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:22px}.page-heading h1{font-size:28px;font-weight:500;margin:2px 0 4px;color:#303030}.page-heading p{margin:0;color:#707070}.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric-label{text-transform:uppercase;letter-spacing:.06em;font-size:11px;color:#707070}.metric-value{font-size:22px;font-weight:600;color:#303030;margin-top:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metric-note{font-size:11px;color:#888;margin-top:4px}.section-actions{display:flex;gap:10px;margin-bottom:14px}@media(max-width:900px){.metric-grid{grid-template-columns:repeat(2,1fr)}.page-heading{display:block}.page-heading .q-btn{margin-top:14px}}@media(max-width:520px){.metric-grid{grid-template-columns:1fr}.admin-toolbar{padding:0 14px}}
</style>
