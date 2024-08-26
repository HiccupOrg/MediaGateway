import { CodegenConfig } from '@graphql-codegen/cli';
import process from "node:process";
import * as fs from 'node:fs';
import * as dotenv from "dotenv";

dotenv.config({
    encoding: "utf-8",
    override: true,
    debug: process.env.DEBUG?.toLowerCase() == "true",
});

const config: CodegenConfig = {
    schema: process.env.REGISTRY_URL!,
    documents: ['src/**/*.{ts,tsx}'],
    generates: {
        './src/registry.generated.ts': {
            plugins: [
                "typescript",
                "typescript-operations",
            ],
            presetConfig: {
                gqlTagName: 'gql',
            }
        }
    },
    ignoreNoDocuments: true,
    hooks: {
        afterOneFileWrite: (filepath) => {
            const data = fs.readFileSync(filepath, 'utf-8');
            const updatedData = data.replace(/(from|export \* from) ['"](\.\/[^'"]+?)['"]/g, "$1 '$2.js'").replace("const documents = []", "const documents: any[] = []");
            fs.writeFileSync(filepath, updatedData, "utf-8");
            return filepath;
        },
    },
};

export default config;
