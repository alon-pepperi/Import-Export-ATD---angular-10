export interface Conflict {
    ID: string;
    Object: string;
    Name: string;
    Status: string;
    //Resolution: KeyValuePair<String>[];
    Resolution: string;
    UUID: string;
}
