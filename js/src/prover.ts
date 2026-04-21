import { Barretenberg, UltraHonkBackend, type UltraHonkBackendOptions, type ProofData } from "@aztec/bb.js";
import { Noir, InputMap, CompiledCircuit } from "@noir-lang/noir_js";
import { InputValue } from "@noir-lang/noirc_abi";

export class ZKEmailProver {
  private backend?: UltraHonkBackend;

  private noir: Noir;

  private bytecode: string;

  private bbApi?: Barretenberg;

  constructor(
    /* The ACIR of the Noir circuit to prove */
    circuit: CompiledCircuit,
    /* Options for proof generation (e.g., verifierTarget) */
    private proofOptions?: UltraHonkBackendOptions,
  ) {
    this.bytecode = circuit.bytecode;
    // initialize the Noir instance
    this.noir = new Noir(circuit);
  }

  /**
   * Initialize the proving backend. Must be called before generating or verifying proofs.
   */
  async init(): Promise<void> {
    if (!this.bbApi) {
      this.bbApi = await Barretenberg.new() as Barretenberg;
      this.backend = new UltraHonkBackend(this.bytecode, this.bbApi);
    }
  }

  /**
   * Compute the witness for a given input to the circuit without generating a proof
   *
   * @param input - the input that should produce a satisfying witness for the circuit
   * @returns - the witness for the input and the output of the circuit if satisfiable
   */
  async simulateWitness(
    input: InputMap
  ): Promise<{ witness: Uint8Array; returnValue: InputValue }> {
    return this.noir.execute(input);
  }

  /**
   * Generate a proof of a satisfying input to the circuit using a provided witness
   *
   * @param witness - a satisfying witness for the circuit
   * @returns proof of valid execution of the circuit
   */
  async prove(
    witness: Uint8Array,
  ): Promise<ProofData> {
    await this.init();
    return this.backend!.generateProof(witness, this.proofOptions);
  }

  /**
   * Simulate the witness for a given input and generate a proof
   *
   * @param input - the input that should produce a satisfying witness for the circuit
   * @returns proof of valid execution of the circuit
   */
  async fullProve(
    input: InputMap,
  ): Promise<ProofData> {
    const { witness } = await this.simulateWitness(input);
    return this.prove(witness);
  }

  /**
   * Verify a proof of a satisfying input to the circuit
   *
   * @param proof - the proof to verify
   * @returns true if the proof is valid, false otherwise
   */
  async verify(
    proof: ProofData,
  ): Promise<boolean> {
    await this.init();
    return this.backend!.verifyProof(proof, this.proofOptions);
  }

  /**
   * End the prover wasm instance and clean up resources
   */
  async destroy() {
    if (this.bbApi) {
      await this.bbApi.destroy();
      this.bbApi = undefined;
      this.backend = undefined;
    }
  }
}
