---
Date: 2026-01-14
Title: Demystifying AI Model Jargon - A Plain English Guide
Description: Weights, parameters, open-weight models, MoE -- a plain English breakdown of the AI jargon you keep hearing but nobody bothers to explain.
---
Ever found yourself nodding along in an AI discussion whilst secretly wondering what everyone's actually talking about? You're not alone. The world of AI models is packed with jargon that sounds impressive but can be genuinely confusing.

Let's break down some of the most common terms you'll hear, in plain English.

## What's Actually Inside an AI Model?

When someone says they're downloading an AI model, what are they actually getting?

### Weights: The Brain of the Operation

Think of weights as billions of tiny knobs that have been carefully adjusted during training. Each weight is just a number that determines how strongly one part of the network influences another.

During training, the model sees millions of examples and slowly tweaks these knobs until it gets good at predicting what comes next. A model like GPT-4 has hundreds of billions of these weights, which is why the files are so massive.

The weights represent everything the model learned. That's why they're so valuable and why companies either guard them closely or release them strategically.

### Parameters: The Bigger Picture

You'll often hear people say "GPT-4 has 1.7 trillion parameters" and "open-weight model" in the same conversation. So which is it, weights or parameters?

Technically, **parameters = weights + biases**.

Biases are additional adjustable values that help the model make better predictions. Think of weights as the volume controls and biases as the bass and treble adjustments. Together, they're all parameters.

In practice, most people use "weights" and "parameters" interchangeably because weights make up 95%+ of the total. When you hear "open-weight model", you're getting all the parameters.

### The Supporting Cast

A complete model isn't just weights. When you download something like GLM-4.7, you're actually getting a folder with several pieces:

- **The tokenizer** - Converts your text into numbers the model understands. Without the exact tokenizer the model was trained with, nothing works properly.
- **Architecture definition** - The blueprint showing how many layers, what types, and how they connect. It's like the difference between knowing a building has bricks (weights) versus knowing how those bricks are arranged.
- **Configuration files** - All the settings: context window size, special tokens, recommended parameters.
- **Metadata** - Version info, licensing, and documentation about what the model can and can't do.

## Open-Weight vs Open-Source: What's the Difference?

This distinction trips people up constantly.

### Open-Weight Models

An **open-weight** model means you can download the trained weights and run the model yourself. You get the weights, the inference code, and usually the tokenizer and config files. What you typically don't get:

- The training code
- The training data
- The full methodology to reproduce the model from scratch

Examples: GLM-4.7, Llama, Mixtral

### True Open-Source

A fully open-source model gives you everything needed to recreate it from scratch -- training code, data sources, the works. This is genuinely rare. Training data tends to be either proprietary or an absolute mess to release cleanly.

### Closed (Proprietary)

Models like GPT-4, Claude, and Gemini keep their weights private. You access them through APIs, paying per token.

### Why It Matters

With open-weight models, you can:

- Run them on your own servers
- Keep your data completely private
- Avoid per-token API costs
- Fine-tune them for specific tasks
- Customise inference behaviour

The trade-off is you can't fully reproduce the training process or audit every decision that went into creating the model. It's a middle ground between fully open and fully closed -- which for most people is more than enough.

## Mixture of Experts: Efficiency Through Specialisation

This is where things get interesting.

### The Problem with Dense Models

Traditional models (called "dense" models) use every single parameter for every single token. If you have a 70 billion parameter model, all 70 billion are active on every word you generate. That's expensive and slow to run.

### The MoE Solution

A **Mixture of Experts (MoE)** model splits the work between multiple smaller "expert" networks. Instead of one massive network doing everything, you have specialists -- and a router that decides which ones to call on.

For each token, only a small subset of experts actually run. The rest stay dormant. It's like a hospital: instead of one doctor handling everything from broken bones to cardiac surgery, you route patients to the right specialist.

### The Benefits

- **Speed and cost** - You might have 70 billion total parameters but only activate 20 billion per token. Much faster inference.
- **Scaling** - You can build larger models without proportional cost increases.
- **Specialisation** - Different experts can naturally gravitate towards different types of knowledge: maths, coding, creative writing, and so on.

### Real Examples

MoE models are often described in a format like "8x7B" -- meaning 8 experts with 7 billion parameters each. Total capacity: 56 billion parameters. But if only 2 experts run per token, the actual inference cost is closer to a 14 billion parameter model. You get the knowledge base of a large model at a fraction of the running cost.

Some notable MoE models:

- Mixtral 8x7B
- GLM-4.7
- DeepSeek-V3
- Reportedly GPT-4 (though OpenAI has never confirmed this)

### The Trade-offs

MoE isn't a free lunch. These models are harder to train -- you need to ensure the routing works well and that experts get balanced usage rather than a few doing all the work. You also still need to load all the experts into memory, even the dormant ones.

But when done right, MoE gives you a model that punches well above its apparent weight.

## Mistral vs Mixtral: Easy to Mix Up

Quick one, because these names cause genuine confusion:

- **Mistral AI** - A French AI company building excellent open-weight models
- **Mistral 7B** - Their dense model with 7 billion parameters
- **Mixtral 8x7B** - Their MoE model; the "x" is a hint at the multiplication

Mistral is the company. Mixtral is specifically their MoE line. Both worth knowing about.

## Wrapping Up

Most of the jargon in AI conversations is actually pretty logical once you know what's underneath:

- **Weights** are the learned numbers that make the model work
- **Parameters** include weights plus biases -- used interchangeably in practice
- **Open-weight** means you can download and run it yourself, without necessarily having the full training story
- **MoE** routes each token to a small set of specialist networks rather than running everything at once

Next time someone mentions they're running Mixtral 8x7B locally, you'll know they're using an open-weight MoE model -- one that's far more efficient to run than a dense model of similar total size.

Now you can nod along with actual understanding.
