import { Component, Host, h, Prop, State, Listen } from '@stencil/core';
import * as d from '../../../../../dist/declarations';
import { createCompiler, path, validateConfig } from '../../../../../compiler/stencil_next.esm';


@Component({
  tag: 'stencil-repl',
  styleUrl: 'stencil-repl.css',
  shadow: true
})
export class StencilRepl {

  @Prop() appName: string = 'Stencil App';
  @Prop() inputs: InputFile[] = [];
  @Prop() stencilUrl: string;

  @State() outputs: OutputFile[] = [];
  @State() selectedTarget = 'collection-next';

  compiler: d.CompilerNext;

  async loadCompiler() {
    if (this.compiler) {
      await this.compiler.destroy();
    }

    const userConfig: d.Config = {
      outputTargets: [
        {
          type: this.selectedTarget as any
        }
      ],
      plugins: [
        (() => {
          if (!this.stencilUrl) {
            return null;
          }
          const fetchText = new Map<string, string>();
          return {
            resolveId: async (importee, importer) => {
              if (importee.includes('@stencil') || (importer && importer.includes('@stencil'))) {
                if (importee.startsWith('@stencil')) {
                  importee = this.stencilUrl + importee;
                }
                if (importer && !path.isAbsolute(importee)) {
                  const importerDir = path.dirname(importer);
                  importee = path.resolve(importerDir, importee);
                }
                if (importee === '/@stencil/core/internal/client') {
                  importee = '/@stencil/core/internal/client/index';
                }
                if (!importee.endsWith('.mjs')) {
                  importee += '.mjs';
                }
                if (!fetchText.has(importee)) {
                  const rsp = await fetch(importee);
                  const text = await rsp.text();
                  fetchText.set(importee, text);
                }
                return importee;
              }
            },
            load: (id) => {
              if (fetchText.has(id)) {
                return fetchText.get(id);
              }
            }
          }
        })()
      ]
    };

    const validated = validateConfig(userConfig);
    logDiagnostics(validated.diagnostics);

    this.compiler = await createCompiler(validated.config);

    const watcher = await this.compiler.createWatcher();

    this.compiler.sys.mkdirSync('/src');
    this.inputs.forEach(input => {
      this.compiler.sys.writeFileSync(input.name, input.code);
    });

    watcher.on('buildFinish', buildResults => {
      this.outputs = [];
      buildResults.outputs.forEach(output => {
        output.files.forEach(fileName => {
          this.outputs.push({
            name: fileName,
            code: this.compiler.sys.readFileSync(fileName)
          });
        });
      });
    });

    await watcher.start();
  }

  @Listen('fileAdd')
  async fileAdd(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileAdd:', filePath);
    const code = (ev.detail as InputFile).code;
    this.compiler.sys.writeFileSync(filePath, code);
    this.inputs = [
      ...this.inputs,
      { name: filePath, code }
    ];
  }

  @Listen('fileUpdate')
  async fileUpdate(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileUpdate:',filePath);
    const code = (ev.detail as InputFile).code;
    this.compiler.sys.writeFileSync(filePath, code);
    const input = this.inputs.find(i => i.name === filePath);
    input.code = code;
    this.inputs = this.inputs.slice();
  }

  @Listen('fileDelete')
  async fileDelete(ev: any) {
    const filePath = (ev.detail as InputFile).name;
    console.log('fileDelete:', filePath);
    this.compiler.sys.unlinkSync(filePath);
    this.inputs = this.inputs.filter(i => i.name !== filePath);
  }

  @Listen('targetUpdate')
  async targetUpdate(ev: any) {
    console.log('targetUpdate:', ev.detail);
    this.selectedTarget = ev.detail;
    await this.loadCompiler();
  }

  async componentDidLoad() {
    await this.loadCompiler();
  }

  render() {
    return (
      <Host>
        <repl-header appName={this.appName}></repl-header>
        <repl-viewport>
          <repl-inputs slot="left" inputs={this.inputs}/>
          <repl-outputs slot="right" outputs={this.outputs} selectedTarget={this.selectedTarget}/>
        </repl-viewport>
      </Host>
    );
  }
}

const logDiagnostics = (diagnostics: d.Diagnostic[]) => {
  diagnostics.forEach(d => {
    if (d.level === 'error') {
      console.error(d.messageText);
    } else if (d.level === 'warn') {
      console.warn(d.messageText);
    } else {
      console.warn(d.messageText);
    }
  });
};

export interface InputFile {
  name: string;
  code?: string;
}

export interface OutputFile {
  name: string;
  code: string;
}
