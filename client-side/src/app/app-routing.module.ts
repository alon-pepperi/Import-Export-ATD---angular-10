import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { PepperiListExampleComponent } from "./pepperi-list-example/pepperi-list-example.component";
import { PepperiNgxLibExamplesComponent } from "./pepperi-ngx-lib-examples/pepperi-ngx-lib-examples.component";
import { EmptyRouteComponent } from "./empty-route/empty-route.component";
import { ImportAtdComponent } from "./import-atd/import-atd.component";
import { ExportAtdComponent } from "./export-atd/export-atd.component";

// import * as config from '../../../addon.config.json';

const routes: Routes = [
    {
        path: `settings/e9029d7f-af32-4b0e-a513-8d9ced6f8186/ngx-lib-components`,
        component: PepperiNgxLibExamplesComponent,
    },
    {
        path: `settings/e9029d7f-af32-4b0e-a513-8d9ced6f8186/ngx-lib-list`,
        component: PepperiListExampleComponent,
    },
    {
        path: `settings/e9029d7f-af32-4b0e-a513-8d9ced6f8186/export-atd`,
        component: ExportAtdComponent,
    },
    {
        path: `settings/e9029d7f-af32-4b0e-a513-8d9ced6f8186/import-atd`,
        component: ImportAtdComponent,
    },
    {
        path: "**",
        component: EmptyRouteComponent,
    },

    // {
    //   path: 'settings/95501678-6687-4fb3-92ab-1155f47f839e/themes',
    //   loadChildren: () => import('./plugin/plugin.module').then(m => m.PluginModule)
    // },
    // {
    //   path: '',
    //   loadChildren: () => import('./plugin/plugin.module').then(m => m.PluginModule)
    // },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
})
export class AppRoutingModule {}
