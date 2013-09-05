/**
 * 滚动获取数据插件 tl 
 * 依赖nanoScroller插件，滚出滚动条样式
 * 
 * 数据的最终结果，是否需要符合ul嵌套li的形式,以便计算滚动条位置使用
 * 
 * 是否可以添加置顶按钮
 * 
 * 是否需要清理内容区域，保证显示的内容条数
 * 
 * 按页，是否只能向下翻。按时间才有可能存在向上翻的情况
 */
(function() {
	$.fn.initScrollPlugin = function($container,options){
		var options = options || {};
		$.extend(scrollPluginManager.defaultOptions, options);
		
		scrollPluginManager.init($container,options);
	}
	
	/* --------------------------------------------以上为对外提供的接口部分-------------- -------------------------- */
	
	var scrollPluginManager = {
		variables : {
			noData : "<div class='prompt'>暂无相关数据...</div>",
			isDownLoading : "isDownLoading",
			downLoadNotData : "downLoadNotData",
			isUpLoading : "isUpLoading",
			upLoadNotData : "upLoadNotData",
			loading : "<div class='loading'><span class='img'></span></div>",
			mainVm : "<div id='scroll_plugin' class='scroll_plugin nano'></div>",
			notInitLoadDataFunction : "<div class='notInitLoadFunction'>无初始化加载数据方法，请确认！！！</div>",
			notUpLoadDataFunction : "<div class='notUpLoadDataFunction'>无向上滚动加载数据方法，请确认！！！</div>",
			notDownLoadDataFunction : "<div class='notDownLoadDataFunction'>无向下滚动加载数据方法，请确认！！！</div>",
			/**
			 * 暂不控制，由调用者控制相应数据
			 */
			pageSize : 10,
			pageNumber : {
				up : 1,
				down : 1
			}
		},
		defaultOptions : {
			//最大允许显示的数据条数
			maxBranches : 20,
			//是否需要启用最大显示条数，这里存在数据块高度无法掌控的问题
			needMaxBranches : false,
			//置顶按钮
			needToTopButton : false,
			/**
			 * 此方法需要返回一个添加到滚动区域的显示对象 $obj
			 * 
			 * conditions 由自己掌控，确定生成数据规则。
			 */
			initLoadData : {
				needLoad : false,
				conditions : null,
				ajaxUrl : null,
				callBack : null
			},
			upLoadData : {
				needLoad : false,
				conditions : null,
				ajaxUrl : null,
				callBack : null
			},
			downLoadData : {
				needLoad : false,
				conditions : null,
				ajaxUrl : null,
				callBack : null
			},
			initLoadDataFunctionReturnVm : null,
			upLoadDataFunctionReturnVm : null,
			downLoadDataFunctionReturnVm : null
		},
		init : function($container,options){
//			console.log("init ::::  :::   ",$container,options);
			scrollPluginManager.generateVm.initDiv($container);
			scrollPluginManager.bindEvent.initEvent($container);
			
			var $initContainer = $container.find(".container");
			
			if(scrollPluginManager.defaultOptions.initLoadData.needLoad){
				//插件实现数据加载，调用默认生成界面回调
				scrollPluginManager.loadAjaxData(scrollPluginManager.defaultOptions.initLoadData.conditions,scrollPluginManager.defaultOptions.initLoadData.ajaxUrl,function(resData){
					if(scrollPluginManager.defaultOptions.initLoadData.callBack && $.isFunction(scrollPluginManager.defaultOptions.initLoadData.callBack)){
						var $lis = scrollPluginManager.defaultOptions.initLoadData.callBack(resData.doclist);
						$initContainer.append($("<ul></ul>").append($lis));
					}else{
						var $lis = scrollPluginManager.generateVm.doclists.ul(resData.doclist);
						$initContainer.append($("<ul></ul>").append($lis));
					}
					
					scrollPluginManager.resetScrollPosition($container.find(".scroll_plugin"));
				});
			}else{
				if(scrollPluginManager.defaultOptions.initLoadDataFunctionReturnVm && $.isFunction(scrollPluginManager.defaultOptions.initLoadDataFunctionReturnVm)){
					var $initDataVm = scrollPluginManager.defaultOptions.initLoadDataFunctionReturnVm();
					$initContainer.append($initDataVm);
					
					scrollPluginManager.resetScrollPosition($container.find(".scroll_plugin"));
				}else{
					$initContainer.append(scrollPluginManager.variables.notInitLoadDataFunction);
				}
			}
		},
		resetScrollPosition : function($scrollObj, opt) {
			if (!$scrollObj || $scrollObj.length == 0 || !$scrollObj.hasClass("nano") || $scrollObj.find("div[class*='content']").length == 0) { return; }
			if (opt) {
				$scrollObj.nanoScroller(opt);
			} else {
				$scrollObj.nanoScroller();
			}
		},
		loadAjaxData : function(conditions,ajaxUrl,callBack){
			var CB = callBack;
			
			// 判断传入条件
			if (arguments.length == 1 && $.isFunction(conditions)) {
				return CB.call(this, "noParams");
			}
			
			jQuery.ajax({
				type : "GET",
				url : ajaxUrl,
				dataType : "json",
				data : conditions,
				error : function(jqXHR, textStatus, errorThrown) {
					if ($.isFunction(CB)) {
						CB.call(this, "error");
					}
				},
				success : function(resData) {
					if ($.isFunction(CB)) {
						CB.call(this, (resData != null) ? resData : "notData");
					}
				}
			});
		},
		scrollDocList : {
			control : function($container) {
				var content = $container.find(".content");
	
				var b = content.scrollTop();
				// JQ转成JS
				var a = content[0].clientHeight;
				var c = content[0].scrollHeight;
				
				if (b == 0) {
					scrollPluginManager.scrollDocList.scroll.up(content);
				}else if (a + b === c) {
					scrollPluginManager.scrollDocList.scroll.down(content);
				}else if(b > a/2){
					var $dynamic_to_top = $("#dynamic_to_top");
					if(!$dynamic_to_top.hasClass("show")){
						$("#dynamic_to_top").addClass("show");
					}
				}else if(b < a/2){
					var $dynamic_to_top = $("#dynamic_to_top");
					if($dynamic_to_top.hasClass("show")){
						$("#dynamic_to_top").removeClass("show");
					}
				}
			},
			scroll : {
				down : function(content) {
					var isDownLoading = content.data(scrollPluginManager.variables.isDownLoading);
					if (!isDownLoading) {
						content.data(scrollPluginManager.variables.isDownLoading,true);
						
						// 给出加载进度条
						var $scrollDiv = content.find(".loadScrollDownDiv");
						$scrollDiv.find(".img").css("display", "block");
						
						var $container = content.find(".container");
						
						//向下滚动，有计算滚动条高度的需要，滚轮的位置必须计算得到
						if(scrollPluginManager.defaultOptions.downLoadData.needLoad){
							//插件实现数据加载，调用默认生成界面回调
							scrollPluginManager.loadAjaxData(scrollPluginManager.defaultOptions.downLoadData.conditions,scrollPluginManager.defaultOptions.downLoadData.ajaxUrl,function(resData){
								$scrollDiv.find(".img").css("display", "none");
								content.data(scrollPluginManager.variables.isDownLoading,false);
								
								if(scrollPluginManager.defaultOptions.downLoadData.callBack && $.isFunction(scrollPluginManager.defaultOptions.downLoadData.callBack)){
									var $lis = scrollPluginManager.defaultOptions.downLoadData.callBack(resData.doclist);
									
									if(scrollPluginManager.defaultOptions.needMaxBranches){
										var $vmlis = content.find("li");
										var maxDocs = $vmlis.length;
										var docNum = resData.doclist.length;
										var delNum = parseInt(maxDocs + docNum - scrollPluginManager.defaultOptions.maxBranches);
										var height = scrollPluginManager.math.scrollHeight.down($vmlis,delNum);	
										
										// 计算滚动条位置
										var top = content.scrollTop();
										content.scrollTop(top - height);
									}
									
									$container.find("ul").append($lis);
									scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
								}else{
									var $lis = scrollPluginManager.generateVm.doclists.ul(resData.doclist);
									if(scrollPluginManager.defaultOptions.needMaxBranches){
										var $vmlis = content.find("li");
										var maxDocs = $vmlis.length;
										var docNum = resData.doclist.length;
										var delNum = parseInt(maxDocs + docNum - scrollPluginManager.defaultOptions.maxBranches);
										var height = scrollPluginManager.math.scrollHeight.down($vmlis,delNum);	
										
										// 计算滚动条位置
										var top = content.scrollTop();
										content.scrollTop(top - height);
									}
									
									$container.find("ul").append($lis);
									scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
								}
							});
						}else{
							$scrollDiv.find(".img").css("display", "none");
							content.data(scrollPluginManager.variables.isDownLoading,false);
							
							if(scrollPluginManager.defaultOptions.downLoadDataFunctionReturnVm && $.isFunction(scrollPluginManager.defaultOptions.downLoadDataFunctionReturnVm)){
								var $upDataVm = scrollPluginManager.defaultOptions.downLoadDataFunctionReturnVm();
								//没有数据个数，无法进行滚动条高度计算
//								if(scrollPluginManager.defaultOptions.needMaxBranches){
//									var $vmlis = content.find("li");
//									var maxDocs = $vmlis.length;
//									var docNum = $upDataVm.length;
//									var delNum = parseInt(maxDocs + docNum - scrollPluginManager.defaultOptions.maxBranches);
//									var height = scrollPluginManager.math.scrollHeight.down($vmlis,delNum);	
//									
//									// 计算滚动条位置
//									var top = content.scrollTop();
//									content.scrollTop(top - height);
//								}
								
								$container.append($upDataVm);
								
								scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
							}else{
								$container.append(scrollPluginManager.variables.notDownLoadDataFunction);
							}
						}
					}
				},
				up : function(content) {
					var isUpLoading = content.data(scrollPluginManager.variables.isUpLoading);
					
					if (!isUpLoading) {
						content.data(scrollPluginManager.variables.isUpLoading,true);
						
						// 给出加载进度条
						var $scrollDiv = content.find(".loadScrollUpDiv");
						$scrollDiv.find(".img").css("display", "block");
						
						var $container = content.find(".container");
						
						//向上滚动，有计算滚动条高度的需要，滚轮的位置必须计算得到
						if(scrollPluginManager.defaultOptions.upLoadData.needLoad){
							//插件实现数据加载，调用默认生成界面回调
							scrollPluginManager.loadAjaxData(scrollPluginManager.defaultOptions.upLoadData.conditions,scrollPluginManager.defaultOptions.upLoadData.ajaxUrl,function(resData){
								$scrollDiv.find(".img").css("display", "none");
								content.data(scrollPluginManager.variables.isUpLoading,false);
								
								if(scrollPluginManager.defaultOptions.upLoadData.callBack && $.isFunction(scrollPluginManager.defaultOptions.upLoadData.callBack)){
									var $lis = scrollPluginManager.defaultOptions.upLoadData.callBack(resData.doclist);
									$container.find("ul").prepend($lis);
									
									var height = scrollPluginManager.math.scrollHeight.up($lis);
									content.scrollTop(height);
									
									if(scrollPluginManager.defaultOptions.needMaxBranches){
										var $maxlis = content.find("li");
										scrollPluginManager.math.cleanMaxBranches.up($maxlis);
									}
									
									scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
								}else{
									var $lis = scrollPluginManager.generateVm.doclists.ul(resData.doclist);
									$container.find("ul").prepend($lis);
									
									var height = scrollPluginManager.math.scrollHeight.up($lis);
									content.scrollTop(height);
									
									if(scrollPluginManager.defaultOptions.needMaxBranches){
										var $maxlis = content.find("li");
										scrollPluginManager.math.cleanMaxBranches.up($maxlis);
									}
									
									scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
								}
							});
						}else{
							$scrollDiv.find(".img").css("display", "none");
							content.data(scrollPluginManager.variables.isUpLoading,false);
							
							if(scrollPluginManager.defaultOptions.upLoadDataFunctionReturnVm && $.isFunction(scrollPluginManager.defaultOptions.upLoadDataFunctionReturnVm)){
								var $upDataVm = scrollPluginManager.defaultOptions.upLoadDataFunctionReturnVm();
								$container.prepend($upDataVm);
								
								var height = scrollPluginManager.math.scrollHeight.up($upDataVm.find("li"));
								content.scrollTop(height);
								
								if(scrollPluginManager.defaultOptions.needMaxBranches){
									var $maxlis = content.find("li");
									scrollPluginManager.math.cleanMaxBranches.up($maxlis);
								}
								
								scrollPluginManager.resetScrollPosition($container.parents(".scroll_plugin"));
							}else{
								$container.prepend(scrollPluginManager.variables.notUpLoadDataFunction);
							}
						}
					}
				}
			}
		},
		bindEvent : {
			initEvent : function($container){
				// 绑定滚动获取数据
				var $scrollDiv = $container.find(".content");
				$scrollDiv.bind("scroll", function() {
					scrollPluginManager.scrollDocList.control($container);
				});
				
				//滚动条插件
				scrollPluginManager.resetScrollPosition($container.find(".scroll_plugin"));
				
				if(scrollPluginManager.defaultOptions.needToTopButton){
					var $dynamic_to_top = $("#dynamic_to_top");
					$dynamic_to_top.unbind();
					$dynamic_to_top.bind('click',function(){
						console.log("scroll to top");
						
						//获取滚动条，进行动画
						$scrollDiv.scrollTop(5);
						
						if($dynamic_to_top.hasClass("show")){
							$("#dynamic_to_top").removeClass("show");
						}
						
					});
				}
			}
		},
		math : {
			scrollHeight : {
				up : function($lis){
					var height = 0;
					$lis.each(function() {
						height = height + $(this).height();
					});
					return height;
				},
				down : function($lis,delNum){
					// 删除列表前面的相应文档数目
					var height = 0;
					$.each($lis, function(index, li) {
						if (index < delNum) {
							$(this).remove();
							height = height + $(this).height();
						}
					});
					return height;
				}
			},
			cleanMaxBranches : {
				up : function($maxlis){
					var maxDocs = $maxlis.length;
					if (parseInt(maxDocs) > parseInt(scrollPluginManager.defaultOptions.maxBranches)) {
						$.each($maxlis, function(index, li) {
							if (index >= scrollPluginManager.defaultOptions.maxBranches) {
								$(this).remove();
							}
						});
					}
				},
				down : function(){
					//在计算高度的位置，已经进行了数据清理
				}
			}
		},
		generateVm : {
			initDiv : function($container){
				$container.empty();
				
				var $scroll_plugin = $(scrollPluginManager.variables.mainVm);
				$container.append($scroll_plugin);
				var $content = $("<div class='content'></div>");
				$scroll_plugin.append($content);
				
				var $loadScrollUpDiv = $("<div class='loadScrollUpDiv'><span class='img'></span></div>");
				var $containerDiv = $("<div class='container'></div>");
				var $loadScrollDownDiv = $("<div class='loadScrollDownDiv'><span class='img'></span></div>");
				$content.append($loadScrollUpDiv).append($containerDiv).append($loadScrollDownDiv);
				
				if(scrollPluginManager.defaultOptions.needToTopButton){
					var $dynamic_to_top = $("<a id='dynamic_to_top' class='dynamic_to_top' href='javascript:void(0);' title='回到顶部'></a>");
					$scroll_plugin.append($dynamic_to_top);
				}
			},
			/**
			 * 插件自带简易生成文档区域代码，供参考.
			 */
			doclists : {
				ul : function(resData) {
					var $lis = $("<ul></ul>");
	
					// 循环获取每一个li
					if (resData) {
						$.each(resData, function(index, doc) {
							var $li = scrollPluginManager.generateVm.doclists.li(doc);
							$lis.append($li);
						});
					}
					return $lis.find(">li");
				},
				li : function(doc) {
					var source = "<span class='source'>[" + doc.mediaType + "]</span>";
					var tltie = "<a class='doc_title' href='javascript:void(0);' title='" + $("<div />").append(doc.title).text() + "' docId='" + doc.id
						+ "'>" + doc.title + "</a>";
					
					var $titleDiv = $("<div class='titleDiv'></div>").append(source).append(tltie);

					if (doc.summary == null || doc.summary == undefined) {
						summary = "<span class='summary'></span>";
					} else {
						summary = "<span class='summary'>" + doc.summary + "</span>";
					}
					var $contentDiv = $("<div class='contentDiv clearBoth notWeiBoMaxHeight'></div>").append(summary);

					var website = "<a class='website'  target='_blank' href='" + doc.fullSite + "' fullSite='" + doc.fullSite + "'>" + doc.websiteName + "</a>";
					var titmelabel = "<span class='titmelabel'><a target='_blank' href='" + doc.url + "'>"
						+ (new Date(parseFloat(doc.submitTime))).pattern("yyyy-MM-dd HH:mm:ss") + "</a></span>";

					var $timeDiv = $("<div class='timeDiv'></div>").append(website).append("<span class='striping'>-</span>").append(titmelabel);

					var $li = $("<li documentid='" + doc.id + "'></li>").append($("<div class='doc_event'></div>").append($titleDiv).append($contentDiv)
					.append($timeDiv));
					
					$li.append("<div class='doc_spliter'></div>");
	
					return $li;
				}
			}
		}
	}
})();
