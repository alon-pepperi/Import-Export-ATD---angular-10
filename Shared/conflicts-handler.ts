import { References, Mapping } from "./../models/referencesMap";
import { Conflict } from "./../models/Conflict";
import { Reference } from "./../models/Reference";
import { Webhook } from "../models/Webhook";


export class conflictsHandler {
    static async fillReferences(referenceMap: References,
        conflicts: Conflict[],
        unresolvedConflicts: Reference[],
        atdReferences: Reference[],
        webhooks: Webhook[]) {
        for (let i = 0; i < atdReferences.length; i++) {
            await this.handleReference(
                atdReferences[i],
                conflicts,
                referenceMap,
                unresolvedConflicts,
                webhooks
            );
        }
    }

    static async handleReference(
        ref: Reference,
        conflicts: Conflict[],
        referenceMap: References,
        unresolvedConflicts: Reference[],
        webhooks: Webhook[]
    ) {
        try {
            if (ref.Type !== "webhook") {
                let referencedPair: Mapping = referenceMap.Mapping.find(
                    (pair) => pair.Origin.Name === ref.Name
                );
                if (referencedPair) {
                    if (!referencedPair.Destination) {
                        // For objects with a path (such as custom form),
                        // if a matching object does not exist, then continue (create this object in the Execution step).
                        if (
                            ref.Type === "file_storage" ||
                            ref.Type === "user_defined_table" ||
                            ref.Type === "filter"
                        ) {
                            const conflict: Conflict = {
                                Name: ref.Name,
                                Object: referencedPair.Origin.Type,
                                Status: "NotFound",
                                Resolution: "CreateNew",
                                UUID: '',
                                ID: ref.ID,
                                // this.resolutionOptions,
                            };
                            conflicts.push(conflict);
                        } else {
                            unresolvedConflicts.push(ref);
                            //throw new Error(content);
                        }
                    } else if (
                        referencedPair.Origin.ID ===
                        referencedPair.Destination.ID
                    ) {
                        return;
                    } else if (
                        referencedPair.Origin.Name ===
                        referencedPair.Destination.Name
                    ) {
                        if (ref.Type === "file_storage") {
                            const filesAreSame = await this.compareFileContentOfOriginAndDest(
                                referencedPair.Origin,
                                referencedPair.Destination
                            );
                            if (filesAreSame == false) {
                                const conflict: Conflict = {
                                    Name: referencedPair.Destination.Name,
                                    Object: referencedPair.Destination.Type,
                                    Status: "ExistsWithDifferentContent",
                                    Resolution: "UseExisting",
                                    UUID: '',
                                    ID: referencedPair.Destination.ID,
                                    // this.resolutionOptions,
                                };
                                conflicts.push(conflict);
                            }
                        }
                    }
                }
            } else {
                const webhook: Webhook = {
                    Url: ref.Content.WEBHOOK_URL,
                    SecretKey: ref.Content.SECRET_KEY,
                    UUID: ref.UUID,
                };

                webhooks.push(webhook);
            }
        } catch (err) {
            throw err;
        }
    }

    static async compareFileContentOfOriginAndDest(
        origin: Reference,
        destinition: Reference
    ): Promise<boolean> {
        try {
            let contentOrigin = await this.fileToBase64(
                origin.Name,
                origin.Path
            );

            let contentDestinition = await this.fileToBase64(
                destinition.Name,
                destinition.Path
            );
            return contentOrigin === contentDestinition;
        } catch (err) {
            throw err;
        }
    }

    static async fileToBase64(filename, filepath) {
        const response = await fetch(filepath);
        if (response.status != 200) {
            throw new Error(
                `Failed to read file: ${filename}\n Path: ${filepath}`
            );
        }
        const text = await response.text();
        return btoa(unescape(encodeURIComponent(text)));

        // return await fetch(filepath).then(async (r) => {
        //     if (r.status != 200) {
        //         throw new Error(
        //             `Failed to read file: ${filename}\n Path: ${filepath}`
        //         );
        //     }
        //     return await btoa(unescape(encodeURIComponent(await r.text())));
        // });
    }
}