import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { EmptyRouteComponent } from "./empty-route/empty-route.component";
import { ImportAtdComponent } from "./import-atd/index";
import { ExportAtdComponent } from "./export-atd/index";

const routes: Routes = [

    {
    path: 'settings/:addon_uuid',

    children: [
        {
            path: 'export-atd',
            component: ExportAtdComponent
        },
        {
            path: 'import-atd',
            component: ImportAtdComponent
        }
    ]
    },
    {
        path: "**",
        component: EmptyRouteComponent,
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
