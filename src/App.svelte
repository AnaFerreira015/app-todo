<script>
 import Tasks from "./Tasks/Task.svelte";
 const projectName = "To Do App";
 const src="https://avatars2.githubusercontent.com/u/23617963?s=40&v=4";
</script>
 
<section class="section">
 <div class="container">

<!-- <figure class="image is-64x64"> -->
	 <!-- Faz a mesma coisa do que o que está descomentado -->
     <!-- <img {src} alt="Svelte3"/> -->
	 <!-- <img src={src} alt="Svelte3"/> -->
   <!-- </figure> -->
   <h1 class="title" style="color: black; text-align: center;">{projectName}</h1>
 </div>
 <Tasks />
</section>